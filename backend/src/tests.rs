#[cfg(test)]
mod tests {
    use rstest::*;
    use crate::*;

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
}
