#[cfg(test)]
mod tests {
    use rstest::*;
    use crate::*;
    use chrono::NaiveDate;

    #[fixture]
    fn sample_time() -> NaiveTime {
        NaiveTime::from_hms_opt(12, 0, 0).unwrap()
    }

    #[rstest]
    fn test_within_4_h(sample_time: NaiveTime) {
        let now = sample_time;
        let dep_time = now + TimeDelta::hours(2);
        assert!(within_4_h(dep_time, now));
    }

    #[rstest]
    #[case("10:00:00", "12:00:00", false)] // 2 hours ago (or 22 hours in future)
    #[case("12:00:00", "12:00:00", true)]  // Now
    #[case("16:00:00", "12:00:00", true)]  // 4 hours in future
    #[case("17:00:00", "12:00:00", false)] // 5 hours in future
    #[case("01:00:00", "23:00:00", true)]  // 2 hours in future (wrap-around)
    fn test_within_4_h_parameterized(#[case] dep_str: &str, #[case] now_str: &str, #[case] expected: bool) {
        let dep_time = NaiveTime::parse_from_str(dep_str, "%H:%M:%S").unwrap();
        let now = NaiveTime::parse_from_str(now_str, "%H:%M:%S").unwrap();
        assert_eq!(within_4_h(dep_time, now), expected);
    }

    #[rstest]
    #[case("stop_id,stop_code,stop_name\n1,,Stop One", "DUMMY_STOP_NAMES")]
    fn test_parse_stop_names(#[case] csv: &str, #[case] expected: &str) {
        let result = parse_stop_names(&csv.as_bytes().to_vec());
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("route_id,agency_id,route_short_name,route_long_name,route_type\n101,,1,Line One,3", "DUMMY_ROUTES")]
    fn test_parse_routes(#[case] csv: &str, #[case] expected: &str) {
        let result = parse_routes(&csv.as_bytes().to_vec());
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("route_id,service_id,trip_id,trip_headsign,direction_id\n101,S1,T1,Headsign,0", "DUMMY_TRIPS")]
    fn test_parse_trips(#[case] csv: &str, #[case] expected: &str) {
        let mut calendar = UstrSet::default();
        calendar.insert(ustr("S1"));
        let result = parse_trips(&csv.as_bytes().to_vec(), &calendar);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS1,1,1,1,1,1,1,1,20000101,20991231", "service_id,date,exception_type\nS1,20260518,2", "DUMMY_CALENDAR")]
    fn test_parse_calendar(#[case] cal: &str, #[case] dates: &str, #[case] expected: &str) {
        let offset = FixedOffset::east_opt(3*3600).unwrap();
        let localtime = NaiveDate::from_ymd_opt(2026, 5, 18).unwrap()
            .and_hms_opt(12, 0, 0).unwrap()
            .and_local_timezone(offset).unwrap();
        let result = parse_calendar(&cal.as_bytes().to_vec(), &dates.as_bytes().to_vec(), localtime);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,12:00:00,12:05:00,1,1", 123456789, "DUMMY_STOPTIMES")]
    fn test_parse_stoptimes(#[case] csv: &str, #[case] fetched_at: i64, #[case] expected: &str) {
        let mut calendar = UstrSet::default();
        // Since we don't have service_id in stoptimes CSV here, 
        // parse_stop_record needs it at index 10.
        // The current implementation of parse_stop_record expects index 10 for service_id.
        // Let's provide a more complete CSV header to match the implementation.
        let full_csv = "trip_id,arrival_time,departure_time,stop_id,stop_sequence,6,7,8,9,10,service_id\nT1,12:00:00,12:05:00,1,1,,,,,S1";
        calendar.insert(ustr("S1"));
        let result = parse_stoptimes(&full_csv.as_bytes().to_vec(), fetched_at, &calendar);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("stop_id,stop_code,stop_name,stop_lat,stop_lon,zone_id,6,location_type,8,municipality_id,10,11,wheelchair_boarding,platform_code,vehicle_type\n1,,Stop One,62.2,25.7,Z1,,0,,M1,,,1,A,3", 987654321, "DUMMY_STOPS_FULL")]
    fn test_parse_stops_full(#[case] csv: &str, #[case] fetched_at: i64, #[case] expected: &str) {
        let result = parse_stops_full(&csv.as_bytes().to_vec(), fetched_at);
        assert_eq!(format!("{:?}", result), expected);
    }
}
