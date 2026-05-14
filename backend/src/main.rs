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
use gtfs_realtime::FeedMessage;
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
use csv::ReaderBuilder;
use chrono::{DateTime,TimeDelta,Utc,Timelike};

static ALERTS: ArcSwapOption<String> = ArcSwapOption::const_empty();
static STOP_NAMES: ArcSwapOption<HashMap<String, String>> = ArcSwapOption::const_empty();
static STOPS: ArcSwapOption<String> = ArcSwapOption::const_empty();

static ASKCREDSSTRING: &str = r#"provide the api credentials as a base-64 encoded token
in the environment variable APICREDS,
see https://opendata.waltti.fi/getting-started
"#;

static SERVICEALERTENDPOINT: &str = "https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/servicealert";
static STATICDATAENDPOINT: &str = "https://tvv.fra1.digitaloceanspaces.com/209.zip";

#[derive(Envconfig)]
pub struct Config {
    #[envconfig(from = "APICREDS")]
    pub creds: String
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

        for i in 0..zip.len() {
            let mut file = zip.by_index(i)?;
            let name = file.name().to_string();
            let mut contents = Vec::with_capacity(file.size().try_into().unwrap());
            file.read_to_end(&mut contents)?;
            filemap.insert(name, contents);
        }
        let stopsmap = parse_stop_names(filemap.get("stops.txt")
            .expect("Waltti failed to return stup data"));
        STOPS.store(Some(Arc::new(parse_stops(&stopsmap))));
        STOP_NAMES.store(Some(Arc::new(stopsmap)));

        println!("successfully fetched static data that was last updated at {} on {} ", timestamp, Utc::now());
        Ok(timestamp)
    }
}

impl FetchTask for StaticFetcher {
    fn next_deadline(&self) -> Instant {
        Instant::now()
    }
    //sets deadline to next 22:00
    fn set_next_deadline(&mut self) {
        let now = Utc::now();
        let mut target_deadline = now
            .with_hour(22).unwrap()
            .with_minute(0).unwrap()
            .with_second(0).unwrap()
            .with_nanosecond(0).unwrap();
        if now < target_deadline {
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

impl FetchTask for AlertFetcher {
    fn next_deadline(&self) -> Instant {
        self.next_deadline
    }
    fn set_next_deadline(& mut self) {
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
fn process_jsonalerts(value: &mut Value, stop_names: &HashMap<String,String>){
    match value{
        Value::Object(map) => {
            let mut additions = Vec::new();

            if let Some(Value::String(id)) = map.get("stop_id") {
                let name = stop_names.get(id).cloned();
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


    process_jsonalerts(&mut response, stop_names);
    serde_json::to_string(&response).ok()
}

fn parse_stop_names(stops : &Vec<u8>) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(stops.as_slice());

    // byte records avoids potential errors in utf8 parsing
    for result in rdr.byte_records() {
        if let Ok(record) = result {
            if let(Some(id_bytes), Some(name_bytes)) = (record.get(0), record.get(2)) {
                let id = String::from_utf8_lossy(id_bytes).into_owned();
                let name = String::from_utf8_lossy(name_bytes).into_owned();

                map.insert(id,name);
            }
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
                (GET) (/api/stops/{id: u64}) => { stop(request,id) },
                (GET) (/api/stops/{id: u64}/departures) => { departures(request,id) },
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
fn parse_stops(stopsmap : &HashMap<String,String>) -> String {
    let time = SystemTime::now().duration_since(UNIX_EPOCH).expect("time did not work").as_millis() as i64;
    let stops: Vec<BusStop> = stopsmap.iter().map(|(key, value)| BusStop {
        stop_id: key,
        stop_name: value
    }).collect();
    let jsonstops : Value = json!({
        "fetchedAt": time,
        "stops": stops
    });
    serde_json::to_string(&jsonstops).expect("failed to serialize data")
}



fn stops(_request: &Request) -> Response{
    let stops_guard = STOPS.load();

    match &*stops_guard {
        None => jsonerror(500, "static data load failure"),
        Some(stops_text) => Response::text(&**stops_text)
    }
}

fn stop(_request: &Request, id: u64) -> Response{
    Response::text(format!("stop id {id}"))
}

fn departures(_request: &Request, id: u64) -> Response{
    Response::text(format!("departures id {id}"))
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

