use rouille::Request;
use rouille::Response;

fn main() {
    rouille::start_server("0.0.0.0:80", move |request| {
        Response::text("hello world")
    });
}
