-- The Your Week feature ad becomes a short muted video of the new cut-paper story (new file names so
-- phones don't keep the old cached image). Old app builds show the poster; new builds play the clip.
update public.ad_campaigns
set media_url = 'https://api.kiongozi.org/ads-media/feat_week_v2.mp4',
    media_type = 'video',
    thumbnail_url = 'https://api.kiongozi.org/ads-media/feat_week_v2.jpg',
    width = 1080, height = 1350,
    placeholder = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gAPTGF2YzYzLjEuMTAxAP/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIABQAEAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AI1jt/JV5D0HOGFUjIvmsgSRSOcMh4FK33T9KpblBV/MBmd9r/Pk7eccZ+nau2rOUGrdSi8+COmOKw7a6k89EO3DOAeO1FFRX+yHVH//2Q==',
    body = 'A few quick slides on your week on KChat, cut from paper: your best numbers, your biggest fan and who you were this week. Share it to your story.'
where media_url in ('https://api.kiongozi.org/ads-media/feat_week.jpg', 'https://api.kiongozi.org/ads-media/feat_week_v2.mp4') and is_house;
