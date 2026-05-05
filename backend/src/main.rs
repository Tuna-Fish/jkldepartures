use rouille::Request;
use rouille::Response;
use rouille::router;
use arc_swap::ArcSwapOption;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use envconfig::Envconfig;
use std::sync::LazyLock;
use reqwest::blocking::Client;
use reqwest::header::{HeaderValue, AUTHORIZATION};
use bytes::Bytes;
use gtfs_realtime::FeedMessage;
use prost::Message;
use zip::ZipArchive;
use std::io::Cursor;
use std::collections::HashMap;
use std::hash::Hash;
use std::io::Read;
use serde_json::json;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
use csv::ReaderBuilder;

static ALERTS: ArcSwapOption<String> = ArcSwapOption::const_empty();

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

static CREDSHEADER: LazyLock<&'static str> = LazyLock::new(|| {
    let config = Config::init_from_env().expect(ASKCREDSSTRING);
    let token = format!("Basic {}", &config.creds );

    Box::leak(token.into_boxed_str())
});


fn fetchstaticdata() -> Result<HashMap<String,Vec<u8>>, Box<dyn std::error::Error>> {
    let response = Client::new()
        .get(STATICDATAENDPOINT)
        .send()?;

    if !response.status().is_success() {
        println!("{}",response.status());
    }

    let requestbytes: Bytes = response.bytes()?;
    let mut zip = ZipArchive::new(Cursor::new(requestbytes))?;
    let mut filemap: HashMap<String, Vec<u8>> = HashMap::new();

    for i in 0..zip.len() {
        let mut file = zip.by_index(i)?;
        let name = file.name().to_string();
        let mut contents = Vec::with_capacity(file.size().try_into().unwrap());
        file.read_to_end(&mut contents)?;
        filemap.insert(name, contents);
    }

    Ok(filemap)
}

fn fetchwithauth(url: &str) -> Option<Bytes> {
    let response = Client::new()
        .get(url)
        .header(AUTHORIZATION,HeaderValue::from_static(*CREDSHEADER))
        .send().ok()?;
    if !response.status().is_success() {
        println!("Fetching alerts returned {}", response.status());
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

fn fetch_alerts_as_json(stop_names : &HashMap<String,String>) -> Option<String> {
    let bytes = fetchwithauth(SERVICEALERTENDPOINT)?;
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


fn main() -> Result<(), Box<dyn std::error::Error>> {
    //for debugging
    let staticdata = fetchstaticdata()?;
    for (key, value) in &staticdata {
        println!("{}: {}", key, value.len());
    }
    let stop_names = parse_stop_names(staticdata.get("stops.txt").expect("Waltti failed to return stup data"));

    thread::spawn(move || {
       loop {
           if let Some(json) = fetch_alerts_as_json(&stop_names) {
               ALERTS.store(Some(Arc::new(json)));
           }
           thread::sleep(Duration::from_secs(61));
       }
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
                _ => Response::empty_404()
            )
        }
            //disabling CORS, we don't care, we have no writes
            .with_unique_header("Access-Control-Allow-Origin", "*")
            .with_unique_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .with_unique_header("Access-Control-Allow-Headers", "*")
    });
}

fn stops(_request: &Request) -> Response{
    Response::text("stops")
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
        None => Response::empty_404()
    }

}
fn vehicles(_request: &Request) -> Response{
    Response::text("vehicles")
}

