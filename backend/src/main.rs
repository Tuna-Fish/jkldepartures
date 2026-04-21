use rouille::Request;
use rouille::Response;
use rouille::router;

fn main() {
    rouille::start_server("0.0.0.0:8081", move |request| {
        //annoyingly, there seems to be no way to match "any multi-part path" in the router macro
        if request.method() == "OPTIONS" {
            rouille::Response::empty_204()
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
            .with_unique_header("Access-Control-Allow-Origin", "*")
            .with_unique_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .with_unique_header("Access-Control-Allow-Headers", "*")
    });
}

fn stops(request: &Request) -> Response{
    Response::text("stops")
}

fn stop(request: &Request, id: u64) -> Response{
    Response::text(format!("stop id {id}"))
}

fn departures(request: &Request, id: u64) -> Response{
    Response::text(format!("departures id {id}"))
}
fn alerts(request: &Request) -> Response{
    Response::text("alerts")
}
fn vehicles(request: &Request) -> Response{
    Response::text("vehicles")
}

