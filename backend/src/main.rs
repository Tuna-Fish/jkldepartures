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
use std::io::Read;

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

fn fetch_alerts_as_json() -> Option<String> {
    let bytes = fetchwithauth(SERVICEALERTENDPOINT)?;
    let feed = FeedMessage::decode(bytes).ok()?;
    let alerts: Vec<_> = feed.entity.into_iter()
        .filter_map(|e| e.alert)
        .collect();

    serde_json::to_string(&alerts).ok()
}




fn main() -> Result<(), Box<dyn std::error::Error>> {
    //for debugging
    let staticdata = fetchstaticdata()?;
    for (key, value) in &staticdata {
        println!("{}: {}", key, value.len());
    }
    thread::spawn(move || {
       loop {
           if let Some(json) = fetch_alerts_as_json() {
               ALERTS.store(Some(Arc::new(json)));
           }
           thread::sleep(Duration::from_secs(61));
       }
    });

    rouille::start_server("0.0.0.0:8081", move |request| {
        //annoyingly, there seems to be no way to match "any multi-part path" in the router macro
        if request.method() == "OPTIONS" {
            rouille::Response::empty_204()
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

