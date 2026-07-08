delete from api_transit_availability_samples
where station_id = 'sub-callai-one'
  and group_name = 'gpt';

update api_transit_offers
set
  availability_seven_day_rate = null,
  availability_seven_day_samples = 0,
  availability_last_checked_at = null,
  availability_note = null,
  updated_at = now()
where station_id = 'sub-callai-one'
  and group_name = 'gpt';

update api_transit_stations
set
  availability_seven_day_rate = null,
  availability_seven_day_samples = 0,
  availability_last_checked_at = null,
  availability_note = null,
  last_updated_at = now()
where id = 'sub-callai-one';
