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
    #[case(r#""stop_id","stop_code","stop_name","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","municipality_id","stop_desc","stop_timezone","wheelchair_boarding","platform_code","vehicle_type"
"1","","Linkkikeskus","62.2408407326719","25.747789144077156","1","","1","","179","","Europe/Helsinki","1","","3"
"3","","Äänekoski","62.602202583785754","25.726115187702543","3","","1","","992","","","1","","3"
"5","","Onnelantien kääntöpaikka","62.50127999339804","25.857279196259704","2","","0","","410","","","0","","3""#, "{u!(\"3\"): u!(\"Äänekoski\"), u!(\"1\"): u!(\"Linkkikeskus\"), u!(\"5\"): u!(\"Onnelantien kääntöpaikka\")}")]
    #[case(r#""stop_id","stop_code","stop_name","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","municipality_id","stop_desc","stop_timezone","wheelchair_boarding","platform_code","vehicle_type"
"1","","Linkkikeskus","62.2408407326719","25.747789144077156","1","","1","","179","","Europe/Helsinki","1","","3"
"3","","Äänekoski","62.602202583785754","25.726115187702543","3","","1","","992","","","1","","3"
"5","","Onnelantien kääntöpaikka","62.50127999339804","25.857279196259704","2","","0","","410","","","0","","3"
roskaa"#, "{u!(\"3\"): u!(\"Äänekoski\"), u!(\"1\"): u!(\"Linkkikeskus\"), u!(\"5\"): u!(\"Onnelantien kääntöpaikka\")}")]
    fn test_parse_stop_names(#[case] csv: &str, #[case] expected: &str) {
        let result = parse_stop_names(&csv.as_bytes().to_vec());
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case(r#""route_id","agency_id","route_short_name","route_long_name","route_desc","route_type","route_url","route_color","route_text_color","bikes_allowed","include_public_feed","extended_contract_id"
"3","6949","Uuraisten Liikenne","Saarijärvi-Jyväskylä","","3","","00662B","FFFFFF","2","1","10"
"12","45131","Matka Mäkelä","KEURUU-JYVÄSKYLÄ","","3","","00662B","FFFFFF","2","1","17"
"13","45131","Matka Mäkelä","KEURUU-JYVÄSKYLÄ","","3","","00662B","FFFFFF","2","1","17""#, "{u!(\"3\"): Route { route_id: u!(\"3\"), route_short_name: u!(\"Uuraisten Liikenne\"), route_long_name: u!(\"Saarijärvi-Jyväskylä\") }, u!(\"13\"): Route { route_id: u!(\"13\"), route_short_name: u!(\"Matka Mäkelä\"), route_long_name: u!(\"KEURUU-JYVÄSKYLÄ\") }, u!(\"12\"): Route { route_id: u!(\"12\"), route_short_name: u!(\"Matka Mäkelä\"), route_long_name: u!(\"KEURUU-JYVÄSKYLÄ\") }}")]
    #[case(r#""route_id","agency_id","route_short_name","route_long_name","route_desc","route_type","route_url","route_color","route_text_color","bikes_allowed","include_public_feed","extended_contract_id"
"3","6949","Uuraisten Liikenne","Saarijärvi-Jyväskylä","","3","","00662B","FFFFFF","2","1","10"
"12","45131","Matka Mäkelä","KEURUU-JYVÄSKYLÄ","","3","","00662B","FFFFFF","2","1","17"
"13","45131","Matka Mäkelä","KEURUU-JYVÄSKYLÄ","","3","","00662B","FFFFFF","2","1","17"
roskaa"#, "{u!(\"3\"): Route { route_id: u!(\"3\"), route_short_name: u!(\"Uuraisten Liikenne\"), route_long_name: u!(\"Saarijärvi-Jyväskylä\") }, u!(\"13\"): Route { route_id: u!(\"13\"), route_short_name: u!(\"Matka Mäkelä\"), route_long_name: u!(\"KEURUU-JYVÄSKYLÄ\") }, u!(\"12\"): Route { route_id: u!(\"12\"), route_short_name: u!(\"Matka Mäkelä\"), route_long_name: u!(\"KEURUU-JYVÄSKYLÄ\") }}")]
    fn test_parse_routes(#[case] csv: &str, #[case] expected: &str) {
        let result = parse_routes(&csv.as_bytes().to_vec());
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case(r#""route_id","service_id","trip_id","trip_headsign","direction_id","block_id","shape_id","bikes_allowed","trip_short_name","wheelchair_accessible","block_id_authority","block_id_agency"
"3","SEUTU M-P talvi","SEUTU_M-P_talvi_3_0_091000_094300_0","Saarijärvi","1","","36","2","","2","",""
"3","SEUTU M-P talvi","SEUTU_M-P_talvi_3_0_141000_143800_0","Saarijärvi","1","","385","2","","2","",""
"3","SEUTU M-P kesä","SEUTU_M-P_talvi_3_1_081700_084900_0","JYVÄSKYLÄ MATKAKESKUS","1","","207","2","","2","","""#, "{u!(\"SEUTU_M-P_talvi_3_0_141000_143800_0\"): Trip { route_id: u!(\"3\"), service_id: u!(\"SEUTU M-P talvi\"), headsign: u!(\"Saarijärvi\"), direction: 1 }, u!(\"SEUTU_M-P_talvi_3_0_091000_094300_0\"): Trip { route_id: u!(\"3\"), service_id: u!(\"SEUTU M-P talvi\"), headsign: u!(\"Saarijärvi\"), direction: 1 }}")]
    #[case(r#""route_id","service_id","trip_id","trip_headsign","direction_id","block_id","shape_id","bikes_allowed","trip_short_name","wheelchair_accessible","block_id_authority","block_id_agency"
"3","SEUTU M-P talvi","SEUTU_M-P_talvi_3_0_091000_094300_0","Saarijärvi","1","","36","2","","2","",""
"3","SEUTU M-P talvi","SEUTU_M-P_talvi_3_0_141000_143800_0","Saarijärvi","1","","385","2","","2","",""
"3","SEUTU M-P kesä","SEUTU_M-P_talvi_3_1_081700_084900_0","JYVÄSKYLÄ MATKAKESKUS","1","","207","2","","2","",""
roskaa"#, "{u!(\"SEUTU_M-P_talvi_3_0_141000_143800_0\"): Trip { route_id: u!(\"3\"), service_id: u!(\"SEUTU M-P talvi\"), headsign: u!(\"Saarijärvi\"), direction: 1 }, u!(\"SEUTU_M-P_talvi_3_0_091000_094300_0\"): Trip { route_id: u!(\"3\"), service_id: u!(\"SEUTU M-P talvi\"), headsign: u!(\"Saarijärvi\"), direction: 1 }}")]
    fn test_parse_trips(#[case] csv: &str, #[case] expected: &str) {
        let mut calendar = UstrSet::default();
        calendar.insert(ustr("SEUTU M-P talvi"));
        let result = parse_trips(&csv.as_bytes().to_vec(), &calendar);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case("\"service_id\",\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\",\"saturday\",\"sunday\",\"start_date\",\"end_date\"\n\"Koulp ei ke\",\"1\",\"1\",\"0\",\"1\",\"1\",\"0\",\"0\",\"20250807\",\"20260531\"\ntrash\n", "", "{u!(\"Koulp ei ke\")}")]
    #[case("\"service_id\",\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\",\"saturday\",\"sunday\",\"start_date\",\"end_date\"\n\"Koulp ei ke\",\"1\",\"1\",\"0\",\"1\",\"1\",\"0\",\"0\",\"20250807\",\"20260531\"", "", "{u!(\"Koulp ei ke\")}")]
    fn test_parse_calendar(#[case] cal: &str, #[case] dates: &str, #[case] expected: &str) {
        let offset = FixedOffset::east_opt(3*3600).unwrap();
        let localtime = NaiveDate::from_ymd_opt(2026, 5, 18).unwrap()
            .and_hms_opt(12, 0, 0).unwrap()
            .and_local_timezone(offset).unwrap();
        let result = parse_calendar(&cal.as_bytes().to_vec(), &dates.as_bytes().to_vec(), localtime);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case(r#""trip_id","arrival_time","departure_time","stop_id","stop_sequence","shape_dist_traveled","timepoint","stop_headsign","pickup_type","drop_off_type","service_id","trip_pattern_id","trip_pattern_variant_id","trip_pattern_variant_order_index"
"Koulp_ei_ke_9227_1_075200_081400_0","07:52:00","07:52:00","207625","1","0.0","0","","0","0","Koulp ei ke","","",""
"Koulp_ei_ke_9227_1_075200_081400_0","07:53:00","07:53:00","143652","2","0.8696","0","","0","0","Koulp ei ke","","",""
"Koulp_ei_ke_9227_1_075200_081400_0","07:53:00","07:53:00","143654","3","1.1859","0","","0","0","Koulp ei ke","","","""#, 123456789, "({u!(\"207625\"): [StopData { depart: 07:52:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 1 }], u!(\"143654\"): [StopData { depart: 07:53:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 3 }], u!(\"143652\"): [StopData { depart: 07:53:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 2 }]}, 123456789)")]
    #[case(r#""trip_id","arrival_time","departure_time","stop_id","stop_sequence","shape_dist_traveled","timepoint","stop_headsign","pickup_type","drop_off_type","service_id","trip_pattern_id","trip_pattern_variant_id","trip_pattern_variant_order_index"
"Koulp_ei_ke_9227_1_075200_081400_0","07:52:00","07:52:00","207625","1","0.0","0","","0","0","Koulp ei ke","","",""
"Koulp_ei_ke_9227_1_075200_081400_0","07:53:00","07:53:00","143652","2","0.8696","0","","0","0","Koulp ei ke","","",""
"Koulp_ei_ke_9227_1_075200_081400_0","07:53:00","07:53:00","143654","3","1.1859","0","","0","0","Koulp ei ke","","",""
roskaa"#, 123456789, "({u!(\"207625\"): [StopData { depart: 07:52:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 1 }], u!(\"143654\"): [StopData { depart: 07:53:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 3 }], u!(\"143652\"): [StopData { depart: 07:53:00, trip_id: u!(\"Koulp_ei_ke_9227_1_075200_081400_0\"), sequence: 2 }]}, 123456789)")]
    fn test_parse_stoptimes(#[case] csv: &str, #[case] fetched_at: i64, #[case] expected: &str) {
        let mut calendar = UstrSet::default();
        calendar.insert(ustr("Koulp ei ke"));
        let result = parse_stoptimes(&csv.as_bytes().to_vec(), fetched_at, &calendar);
        assert_eq!(format!("{:?}", result), expected);
    }

    #[rstest]
    #[case(r#""stop_id","stop_code","stop_name","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","municipality_id","stop_desc","stop_timezone","wheelchair_boarding","platform_code","vehicle_type"
"1","","Linkkikeskus","62.2408407326719","25.747789144077156","1","","1","","179","","Europe/Helsinki","1","","3"
"3","","Äänekoski","62.602202583785754","25.726115187702543","3","","1","","992","","","1","","3"
"5","","Onnelantien kääntöpaikka","62.50127999339804","25.857279196259704","2","","0","","410","","","0","","3""#, 987654321, "{u!(\"3\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.602202583785754\\\",\\\"location_type\\\":\\\"1\\\",\\\"lon\\\":\\\"25.726115187702543\\\",\\\"municipality_id\\\":\\\"992\\\",\\\"name\\\":\\\"Äänekoski\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"3\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"1\\\",\\\"zone_id\\\":\\\"3\\\"}}\", u!(\"1\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.2408407326719\\\",\\\"location_type\\\":\\\"1\\\",\\\"lon\\\":\\\"25.747789144077156\\\",\\\"municipality_id\\\":\\\"179\\\",\\\"name\\\":\\\"Linkkikeskus\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"1\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"1\\\",\\\"zone_id\\\":\\\"1\\\"}}\", u!(\"5\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.50127999339804\\\",\\\"location_type\\\":\\\"0\\\",\\\"lon\\\":\\\"25.857279196259704\\\",\\\"municipality_id\\\":\\\"410\\\",\\\"name\\\":\\\"Onnelantien kääntöpaikka\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"5\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"0\\\",\\\"zone_id\\\":\\\"2\\\"}}\"}")]
    #[case(r#""stop_id","stop_code","stop_name","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","municipality_id","stop_desc","stop_timezone","wheelchair_boarding","platform_code","vehicle_type"
"1","","Linkkikeskus","62.2408407326719","25.747789144077156","1","","1","","179","","Europe/Helsinki","1","","3"
"3","","Äänekoski","62.602202583785754","25.726115187702543","3","","1","","992","","","1","","3"
"5","","Onnelantien kääntöpaikka","62.50127999339804","25.857279196259704","2","","0","","410","","","0","","3"
roskaa"#, 987654321, "{u!(\"3\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.602202583785754\\\",\\\"location_type\\\":\\\"1\\\",\\\"lon\\\":\\\"25.726115187702543\\\",\\\"municipality_id\\\":\\\"992\\\",\\\"name\\\":\\\"Äänekoski\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"3\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"1\\\",\\\"zone_id\\\":\\\"3\\\"}}\", u!(\"1\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.2408407326719\\\",\\\"location_type\\\":\\\"1\\\",\\\"lon\\\":\\\"25.747789144077156\\\",\\\"municipality_id\\\":\\\"179\\\",\\\"name\\\":\\\"Linkkikeskus\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"1\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"1\\\",\\\"zone_id\\\":\\\"1\\\"}}\", u!(\"5\"): \"{\\\"fetchedAt\\\":987654321,\\\"stop\\\":{\\\"lat\\\":\\\"62.50127999339804\\\",\\\"location_type\\\":\\\"0\\\",\\\"lon\\\":\\\"25.857279196259704\\\",\\\"municipality_id\\\":\\\"410\\\",\\\"name\\\":\\\"Onnelantien kääntöpaikka\\\",\\\"platform_code\\\":\\\"\\\",\\\"stopId\\\":\\\"5\\\",\\\"vehicle_type\\\":\\\"3\\\",\\\"wheelchair_boarding\\\":\\\"0\\\",\\\"zone_id\\\":\\\"2\\\"}}\"}")]
    fn test_parse_stops_full(#[case] csv: &str, #[case] fetched_at: i64, #[case] expected: &str) {
        let result = parse_stops_full(&csv.as_bytes().to_vec(), fetched_at);
        assert_eq!(format!("{:?}", result), expected);
    }
}
