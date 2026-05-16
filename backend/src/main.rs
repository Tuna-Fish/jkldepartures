use rouille::Request;
use rouille::Response;
use rouille::router;
use arc_swap::ArcSwapOption;
use std::sync::Arc;
use std::thread;
use envconfig::Envconfig;
use std::sync::LazyLock;
use reqwest::blocking::Client;
use reqwest::header::{HeaderValue, AUTHORIZATION};
use bytes::Bytes;
use gtfs_realtime::{FeedMessage, TripUpdate};
use prost::Message;
use zip;
use std::error::Error;
use std::io::Cursor;
use std::collections::HashMap;
use std::io::Read;
use serde_json::json;
use serde_json::Value;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH, Duration, Instant};
use csv::{ByteRecord, ReaderBuilder};
use chrono::{NaiveTime,DateTime,TimeDelta,Utc,Timelike,Local};
use ustr::{Ustr, ustr,UstrMap};
use std::cmp::Ordering;

static ALERTS: ArcSwapOption<String> = ArcSwapOption::const_empty();
static STOP_NAMES: ArcSwapOption<UstrMap<Ustr>> = ArcSwapOption::const_empty();
static STOPS_LIST: ArcSwapOption<String> = ArcSwapOption::const_empty();
static STOPS: ArcSwapOption<UstrMap<String>> = ArcSwapOption::const_empty();
static STOPTIMES_BY_STOP: ArcSwapOption<(UstrMap<Vec<StopData>>,i64)> = ArcSwapOption::const_empty();
static TRIPUPDATES: ArcSwapOption<(UstrMap<UpdateData>,i64)> = ArcSwapOption::const_empty();
static ROUTES: ArcSwapOption<UstrMap<Route>> = ArcSwapOption::const_empty();
static TRIPS: ArcSwapOption<UstrMap<Trip>> = ArcSwapOption::const_empty();


static ASKCREDSSTRING: &str = r#"provide the api credentials as a base-64 encoded token
in the environment variable APICREDS,
see https://opendata.waltti.fi/getting-started
"#;

static TRIPUPDATEENDPOINT: &str = "https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/tripupdate";
static SERVICEALERTENDPOINT: &str = "https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/servicealert";
static STATICDATAENDPOINT: &str = "https://tvv.fra1.digitaloceanspaces.com/209.zip";

#[derive(Envconfig)]
pub struct Config {
    #[envconfig(from = "APICREDS")]
    pub creds: String
}
#[derive(Copy,Clone, PartialEq, Eq, Ord, PartialOrd, Debug, Serialize)]
pub struct StopData {
    #[serde(skip_serializing)]
    depart: NaiveTime,
    trip_id: Ustr,
    sequence: u16
}
#[derive(Serialize,Debug)]
pub struct JoinedStopData<'a> {
    #[serde(flatten)]
    pub stop: &'a StopData,
    pub depart: i64,
    #[serde(flatten)]
    pub trip: Option<&'a Trip>,
    #[serde(flatten)]
    pub route: Option<&'a Route>
}
#[derive(Serialize,Debug)]
pub struct Trip {
    route_id: Ustr,
    service_id: Ustr,
    headsign: Ustr,
    direction: u8,
}
#[derive(Serialize,Debug)]
pub struct Route {
    #[serde(skip_serializing)]
    route_id: Ustr,
    route_short_name: Ustr,
    route_long_name: Ustr,
}

pub struct UpdateData {

}


pub trait FetchTask: Send {
    fn next_deadline(&self) -> Instant;
    fn set_next_deadline(&mut self);
    fn deadline_has_passed(&self) -> bool;
    fn run(&mut self);
}

pub struct StaticFetcher {
    endpoint: String,
    deadline: DateTime<Utc>,
    last_fetch: DateTime<Utc>
}

impl StaticFetcher {
    pub fn new(endpoint: &str) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            deadline: DateTime::<Utc>::MIN_UTC,
            last_fetch: DateTime::<Utc>::MIN_UTC
        }
    }
    fn update_static_data(&mut self) -> Result<DateTime<Utc>,Box<dyn Error>> {
        let response = Client::new()
            .get(&self.endpoint)
            .send()?;

        if !response.status().is_success() {
            println!("{}",response.status());
            return Err(Box::from("failure to fetch static data"));
        }

        let Some(timestamp) = response
            .headers()
            .get(reqwest::header::LAST_MODIFIED)
            .and_then(|hdr| hdr.to_str().ok())
            .and_then(|str_val| DateTime::parse_from_rfc2822(str_val).ok())
            .map(|dt| dt.into())
            else {
                return Err(Box::from("Failed to extract or parse Last-Modified header"));
            };

        let requestbytes: Bytes = response.bytes()?;
        let mut zip = zip::ZipArchive::new(Cursor::new(requestbytes))?;
        let mut filemap: HashMap<String, Vec<u8>> = HashMap::new();
        let fetched_at = SystemTime::now().duration_since(UNIX_EPOCH).expect("time did not work").as_millis() as i64;

        for i in 0..zip.len() {
            let mut file = zip.by_index(i)?;
            let name = file.name().to_string();
            let mut contents = Vec::with_capacity(file.size().try_into().unwrap());
            file.read_to_end(&mut contents)?;
            filemap.insert(name, contents);
        }
        let stopsmap = parse_stop_names(filemap.get("stops.txt")
            .ok_or("Waltti failed to return stop data")?);

        STOPS_LIST.store(Some(Arc::new(parse_stops(&stopsmap,fetched_at))));
        STOP_NAMES.store(Some(Arc::new(stopsmap)));
        let full_stop_data = parse_stops_full(filemap.get("stops.txt")
                                                  .ok_or("really should be unreachable")?, fetched_at);
        STOPS.store(Some(Arc::new(full_stop_data)));
        let stoptimes = parse_stoptimes(filemap.get("stop_times.txt")
                                            .ok_or("stoptimes missing")?, fetched_at);
        STOPTIMES_BY_STOP.store(Some(Arc::new(stoptimes)));
        let routes = parse_routes(filemap.get("routes.txt").ok_or("routes missing")?);
        ROUTES.store(Some(Arc::new(routes)));
        let trips = parse_trips(filemap.get("trips.txt").ok_or("trips missing")?);
        TRIPS.store(Some(Arc::new(trips)));

        println!("successfully fetched static data that was last updated at {} on {} ", timestamp, Utc::now());
        Ok(timestamp)
    }
}

impl FetchTask for StaticFetcher {
    // changing clocks, etc can make this conversion very unreliable. Instant is monotonic,
    // while DateTime is complex. However, since this is not saved past one invocation, and there
    // are always shorter deadlines, it honestly doesn't matter too much if it's off.
    fn next_deadline(&self) -> Instant {
        let duration = (self.deadline- Utc::now()).to_std().unwrap_or(Duration::ZERO);
        return Instant::now() + duration;
    }
    //sets deadline to next 22:00
    fn set_next_deadline(&mut self) {
        let now = Utc::now();
        let mut target_deadline = now
            .with_hour(22).unwrap()
            .with_minute(0).unwrap()
            .with_second(0).unwrap()
            .with_nanosecond(0).unwrap();
        if now > target_deadline {
            target_deadline += TimeDelta::days(1);
        }
        self.deadline = target_deadline;
    }
    fn deadline_has_passed(&self) -> bool {
        let now = Utc::now();
        now > self.deadline
    }
    // When staticfetcher runs, it "seizes" control of the fetch thread for a while, because other
    // data sources depend on the static data, and static date update time varies by a few seconds.
    // We need to make sure that no new dynamic data is used with old static data. We do this by not
    // allowing other fetches after the static data could have update, until it has. This will cause
    // a blip in updates at midnight, usually for 5-15 seconds
    fn run(& mut self) {
        let client = Client::new();
        loop {
            let response = client.head(&self.endpoint).send().ok().filter(|r| r.status().is_success());
            let current_modification : Option<DateTime<Utc>> = response
                .and_then(|res| res.headers().get(reqwest::header::LAST_MODIFIED).cloned())
                .and_then(|hdr| hdr.to_str().ok().map(String::from))
                .and_then(|str_val| DateTime::parse_from_rfc2822(&str_val).ok())
                .map(|dt| dt.into());
            //got valid timestamp from server
            if let Some(timestamp) = current_modification {
                //data updated since last attempt
                if timestamp > self.last_fetch {
                    match self.update_static_data() {
                        Ok(time) => {
                            self.last_fetch = time;
                            break;
                        }
                        Err(e) => {
                            println!("{}", e);
                        }
                    }
                }
            } else {
                println!("Network error, unexpected status, or missing/invalid update metadata.");
            }
            std::thread::sleep(Duration::from_secs(5));

        }
    }
}


pub struct AlertFetcher {
    endpoint: String,
    delay: Duration,
    next_deadline: Instant
}

impl AlertFetcher {
    pub fn new(endpoint: &str,delay: Duration) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            delay,
            next_deadline: Instant::now()
        }
    }
}

pub struct TripUpdateFetcher{
    endpoint: String,
    delay: Duration,
    next_deadline: Instant
}

impl TripUpdateFetcher {
    pub fn new(endpoint: &str, delay: Duration) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            delay,
            next_deadline: Instant::now()
        }
    }
}

impl FetchTask for TripUpdateFetcher {
    fn next_deadline(&self) -> Instant { self.next_deadline }
    fn set_next_deadline(&mut self) { self.next_deadline = Instant::now() + self.delay; }
    fn deadline_has_passed(&self) -> bool { Instant::now() >= self.next_deadline }
    fn run(&mut self) {
        if let Some(updates) = fetch_tripupdate(&self.endpoint) {
            TRIPUPDATES.store(Some(Arc::new(updates)));
        }
    }
}

impl FetchTask for AlertFetcher {
    fn next_deadline(&self) -> Instant { self.next_deadline }
    fn set_next_deadline(&mut self) {
        self.next_deadline = Instant::now() + self.delay;
    }
    fn deadline_has_passed(&self) -> bool {
        Instant::now() >= self.next_deadline
    }
    fn run(&mut self) {
        if let Some(json) = fetch_alerts_as_json(&self.endpoint) {
            ALERTS.store(Some(Arc::new(json)));
        }
    }
}

pub struct Scheduler {
    tasks: Vec<Box<dyn FetchTask>>,
}

impl Scheduler {
    pub fn new(tasks:Vec<Box<dyn FetchTask>>) -> Self {
        Self { tasks }
    }
    pub fn run(&mut self) {
        loop {
            //dummy value, a very long time
            let mut next_wakeup = Instant::now() + Duration::from_secs(365*24*60*60);

            for task in self.tasks.iter_mut() {
                if task.deadline_has_passed() {
                    task.run();
                    task.set_next_deadline();
                }
                next_wakeup = next_wakeup.min( task.next_deadline());
            }
            std::thread::sleep(next_wakeup.saturating_duration_since(Instant::now()));
        }
    }
}

static CREDSHEADER: LazyLock<&'static str> = LazyLock::new(|| {
    let config = Config::init_from_env().expect(ASKCREDSSTRING);
    let token = format!("Basic {}", &config.creds );

    Box::leak(token.into_boxed_str())
});

fn fetchwithauth(url: &str) -> Option<Bytes> {
    let response = Client::new()
        .get(url)
        .header(AUTHORIZATION,HeaderValue::from_static(*CREDSHEADER))
        .send().ok()?;

    if !response.status().is_success() {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

        println!("{} Fetching {} returned {}", now, url, response.status());
        None
    } else {
        Some(response.bytes().ok()?)
    }
}


// Adds names alongside id:s, and removes null values from response
// (unless they are just added unfound names)
fn process_jsonalerts(value: &mut Value, stop_names: &UstrMap<Ustr>){
    match value{
        Value::Object(map) => {
            let mut additions = Vec::new();

            if let Some(Value::String(id)) = map.get("stop_id") {
                let name = stop_names.get(&ustr(id)).cloned();
                additions.push(("stop_name", json!(name)));
            }
            for (k,v) in additions {
                map.insert(k.to_string(), v);
            }

            map.retain(|k,v| !v.is_null()|| k == "stop_name");

            for v in map.values_mut() {
                process_jsonalerts(v, stop_names);
            }
        }
        Value::Array(arr) => {
            for v in arr.iter_mut() {
                process_jsonalerts(v, stop_names);
            }
        }
        _ => {}
    }
}

fn testd(update: TripUpdate) -> Option<()> {
    for stoptime in update.stop_time_update.iter() {
        if stoptime.departure?.delay.is_some()
        {
            println!("{update:?}");
            return Some(());
        }
    }
    return None;
}


fn fetch_tripupdate(endpoint: &str) -> Option<(UstrMap<UpdateData>, i64)> {
    let bytes = fetchwithauth(endpoint)?;
    let time = SystemTime::now().duration_since(UNIX_EPOCH).expect("time did not work").as_millis() as i64;
    let feed = FeedMessage::decode(bytes).ok()?;
    let map: UstrMap<UpdateData> = UstrMap::default();

    for entity in feed.entity {
        let Some(trip_update) = entity.trip_update else {continue;};
        if testd(trip_update).is_some() {
            break;
        }
    }
    None
}


fn fetch_alerts_as_json(endpoint: &str) -> Option<String> {
    let stop_names_guard = STOP_NAMES.load();

    let Some(stop_names) = stop_names_guard.as_ref() else { return None };

    let bytes = fetchwithauth(endpoint)?;
    let time = SystemTime::now().duration_since(UNIX_EPOCH).expect("time did not work").as_millis() as i64;
    let feed = FeedMessage::decode(bytes).ok()?;
    let alerts: Vec<_> = feed.entity.into_iter()
        .filter_map(|e| e.alert)
        .collect();
    let mut response : Value = json!({
        "fetchedAt": time,
        "alerts": alerts
    });


    process_jsonalerts(&mut response, &**stop_names);
    serde_json::to_string(&response).ok()
}

fn parse_stop_names(stops : &Vec<u8>) -> UstrMap<Ustr> {
    let mut map = UstrMap::default();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(stops.as_slice());


    for result in rdr.byte_records() {
        if let Ok(record) = result {
            if let(Some(id), Some(name)) =
                (record.get(0).and_then(|bytes| std::str::from_utf8(bytes).ok()),
                 record.get(2).and_then(|bytes| std::str::from_utf8(bytes).ok())) {

                map.insert(ustr(id),ustr(name));
            }
        }
    }
    map
}
// any parse failures lead to skipping the record
fn parse_route_record(record: &ByteRecord) -> Option<Route> {
    let route_id = ustr(std::str::from_utf8(record.get(0)?).ok()?);
    let route_short_name = ustr(std::str::from_utf8(record.get(2)?).ok()?);
    let route_long_name = ustr(std::str::from_utf8(record.get(3)?).ok()?);

    Some(Route {
        route_id,
        route_short_name,
        route_long_name
    })
}

fn parse_routes(data: &Vec<u8>) -> UstrMap<Route> {
    let mut routes: UstrMap<Route> = UstrMap::default();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data.as_slice());
    for result in rdr.byte_records() {
        let Ok(record) = result else {continue};
        let Some(route) = parse_route_record(&record) else {continue};
        routes.insert(route.route_id,route);
    }
    routes
}

fn parse_trip_record(record: &ByteRecord) -> Option<(Ustr, Trip)> {
    let route_id = ustr(std::str::from_utf8(record.get(0)?).ok()?);
    let service_id = ustr(std::str::from_utf8(record.get(1)?).ok()?);
    let trip_id = ustr(std::str::from_utf8(record.get(2)?).ok()?);
    let headsign = ustr(std::str::from_utf8(record.get(3)?).ok()?);
    let direction = std::str::from_utf8(record.get(4)?).ok()?.parse().ok()?;

    Some((trip_id, Trip {
        route_id,
        service_id,
        headsign,
        direction,
    }))
}

fn parse_trips(data: &Vec<u8>) -> UstrMap<Trip> {
    let mut trips: UstrMap<Trip> = UstrMap::default();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data.as_slice());
    for result in rdr.byte_records() {
        let Ok(record) = result else {continue};
        let Some((trip_id, trip)) = parse_trip_record(&record) else {continue};
        trips.insert(trip_id, trip);
    }
    trips
}

// if any of the fields fails to parse, we toss the record.
fn parse_stop_record(record: &ByteRecord) -> Option<(Ustr, StopData)> {
    let trip_id = ustr(std::str::from_utf8(record.get(0)?).ok()?);
    let depart =  std::str::from_utf8(record.get(2)?).ok()?;
    let stop_id = ustr(std::str::from_utf8(record.get(3)?).ok()?);
    let stop_seq = std::str::from_utf8(record.get(4)?).ok()?;

    Some((stop_id,StopData{
        depart: NaiveTime::parse_from_str(depart, "%H:%M:%S").ok()?,
        sequence: stop_seq.parse().ok()?,
        trip_id,
    }))
}

fn parse_stoptimes(data: &Vec<u8>, fetched_at: i64) -> (UstrMap<Vec<StopData>>, i64) {
    let mut stops: UstrMap<Vec<StopData>> = UstrMap::default();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data.as_slice());

    for result in rdr.byte_records() {
        let Ok(record) = result else { continue };
        let Some((stop_id, stopdata)) = parse_stop_record(&record) else { continue };
        stops
            .entry(stop_id)
            .or_default()
            .push(stopdata);
    }
    for vec in stops.values_mut() {
        vec.sort();
    }
    (stops, fetched_at)
}

// zero copy returns a valid utf-8 reference or ""
fn bytesref_to_str(data: Option<&[u8]>) -> &str {
    data
        .and_then(|bytes| std::str::from_utf8(bytes).ok())
        .unwrap_or("")
}

fn parse_stops_full(stops : &Vec<u8>, fetched_at: i64) -> UstrMap<String> {
    let mut map :UstrMap<String> = UstrMap::default();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(stops.as_slice());

    // byte records avoids potential errors in utf8 parsing if data contains invalid values
    for result in rdr.byte_records() {
        let Ok(record) = result else { continue };
        // require that all returned records have at least id and name
        if let(Some(id), Some(name)) =
            (record.get(0).and_then(|bytes| std::str::from_utf8(bytes).ok()),
             record.get(2).and_then(|bytes| std::str::from_utf8(bytes).ok())) {


            let jsonstops : Value = json!({
                "fetchedAt": fetched_at,
                "name": name,
                // rest of the fields are optional, provided if found
                "stopId": id,
                "lat" : bytesref_to_str(record.get(3)),
                "lon" : bytesref_to_str(record.get(4)),
                "zone_id" : bytesref_to_str(record.get(5)),
                "location_type" : bytesref_to_str(record.get(7)),
                "municipality_id" : bytesref_to_str(record.get(9)),
                "wheelchair_boarding" : bytesref_to_str(record.get(12)),
                "platform_code" : bytesref_to_str(record.get(13)),
                "vehicle_type" : bytesref_to_str(record.get(14)),

            });
            let json = serde_json::to_string(&jsonstops).expect("failed to serialize data");
            map.insert(ustr(id),json);
        }
    }
    map
}

#[derive(Serialize)]
struct ErrorResponse<'a> {
    code: u16,
    message: &'a str,
    timestamp: u64,
}

fn jsonerror(code: u16, message: &str) -> Response {
    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let payload = ErrorResponse {
        code,
        message,
        timestamp: current_timestamp,
    };

    Response::json(&payload).with_status_code(code)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    //for debugging
    let tasks : Vec<Box<dyn FetchTask>> = vec![
        Box::new(StaticFetcher::new(STATICDATAENDPOINT )) as Box<dyn FetchTask>,
        Box::new(AlertFetcher::new(SERVICEALERTENDPOINT, Duration::from_secs(61))) as Box<dyn FetchTask>,
        Box::new( TripUpdateFetcher::new(TRIPUPDATEENDPOINT,Duration::from_secs(31))) as Box<dyn FetchTask>,

    ];


    thread::spawn(move || {
        let mut sched = Scheduler::new(tasks);
        sched.run();
    });

    rouille::start_server("0.0.0.0:8081", move |request| {
        //annoyingly, there seems to be no way to match "any multi-part path" in the router macro
        if request.method() == "OPTIONS" {
            Response::empty_204()
                //make options responses last a day
                .with_unique_header("Access-Control-Max-Age", "86400")
        } else {
            router!(request,
                (GET) (/api/stops) => { stops(request) },
                (GET) (/api/stops/{id: String}) => { stop(request,id) },
                (GET) (/api/stops/{id: String}/departures) => { departures(request,id) },
                (GET) (/api/alerts) => { alerts(request) },
                (GET) (/api/vehicles) => { vehicles(request)},
                _ => jsonerror(404,"pyyntö ei tunnistettu")
            )
        }
            //disabling CORS, we don't care, we have no writes
            .with_unique_header("Access-Control-Allow-Origin", "*")
            .with_unique_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .with_unique_header("Access-Control-Allow-Headers", "*")
    });
}
#[derive(Serialize)]
struct BusStop<'a> {
    stop_id: &'a str,
    stop_name: &'a str,
}
fn parse_stops(stopsmap : &UstrMap<Ustr>, fetched_at: i64) -> String {
    let stops: Vec<BusStop> = stopsmap.iter().map(|(key, value)| BusStop {
        stop_id: key,
        stop_name: value
    }).collect();
    let jsonstops : Value = json!({
        "fetchedAt": fetched_at,
        "stops": stops
    });
    serde_json::to_string(&jsonstops).expect("failed to serialize data")
}



fn stops(_request: &Request) -> Response{
    let stops_guard = STOPS_LIST.load();

    match &*stops_guard {
        None => jsonerror(500, "static data load failure"),
        Some(stops_text) => Response::text(&**stops_text)
    }
}

fn stop(_request: &Request, id: String) -> Response{
    let stops_guard = STOPS.load();
    match &*stops_guard {
        None => jsonerror(500, "static data load failure"),
        Some(stops_map) => {
            if let Some(json) = (&**stops_map).get(&ustr(&id)) {
                Response::text(json)
            } else {
                jsonerror(404, "stop not found")
            }

        }
    }
}
fn departures_later_than(stoptimes: &Vec<StopData>, time: NaiveTime) -> &[StopData]{
    let index = stoptimes.partition_point(|x | x.depart < time);
    &stoptimes[index..]
}

fn within_4_h(dep_time:NaiveTime, now: NaiveTime) -> bool {
    let diff = dep_time - now;
    let forward_minutes = (diff.num_minutes() + 1440) % 1440;
    forward_minutes <= 240
}
// today, unless already in the past and more than 8 hours ago
fn calculate_timestamp(depart: NaiveTime, localtime: NaiveTime) -> i64 {
0
}

fn departures(_request: &Request, id: String) -> Response{
    let stoptimesguard = STOPTIMES_BY_STOP.load();
    let tripsguard = TRIPS.load();
    let routesguard= ROUTES.load();

    match (stoptimesguard.as_ref(),tripsguard.as_ref(),routesguard.as_ref()) {
        (Some(stoparc),Some(triparc),Some(routearc)) => {
            let (times_by_stop, fetched_at) = &**stoparc;
            let trips = &**triparc;
            let routes = &**routearc;

            let Some(stopinfo) = times_by_stop.get(&ustr(&id))
                else { return jsonerror(404,"could not find stop")};
            let localtime : NaiveTime = Local::now().time();
            let departures : Vec<JoinedStopData> =
                departures_later_than(stopinfo,localtime)
                    .into_iter()
                    .take(20)
                    .take_while(|stop| within_4_h(stop.depart, localtime))
                    .map(|stop| {
                        let trip = trips.get(&stop.trip_id);
                        let route = trip.and_then(|t| routes.get(&t.route_id));
                        let depart: i64 = calculate_timestamp(stop.depart, localtime);

                        JoinedStopData {
                            stop,
                            depart,
                            trip,
                            route

                        }
                    }).collect();

            let jsondepartures : Value = json!({
                "fetchedAt": fetched_at,
                "stopId": id,
                "departures" : departures
                });
            Response::text(jsondepartures.to_string())
        }
        _ => jsonerror(500,"static data load failure"),
    }

}
fn alerts(_request: &Request) -> Response{
    let alertsguard = ALERTS.load();

    match &*alertsguard {
        Some(alertsjsonstring) => Response::text(&**alertsjsonstring),
        None => jsonerror(500,"static data load failure")
    }

}
fn vehicles(_request: &Request) -> Response{
    Response::text("vehicles")
}

