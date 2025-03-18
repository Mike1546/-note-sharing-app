$accessToken = "eyJhbGciOiJFUzI1NiIsImtpZCI6Il9vcEVRMWQ4dFJpV0RBeEFYUEwxTWpObkhYLXlzUW9MYlotSllTRTFPSE0iLCJ0eXAiOiJEQVQifQ.eyJudCI6IkFOIiwiYWlkIjoiNDc0NTc4IiwiZGlkIjoiMjA3MTY2NyIsImp0aSI6ImVhYzdjNzQ5LTQ5Y2YtNGFlYy1hYjJlLTQ4NDlkZGI3MjhjOCIsImlzcyI6InR3aW5nYXRlIiwiYXVkIjoibWFuc3VybXVzYSIsImV4cCI6MTc0MjE4Mjg2MCwiaWF0IjoxNzQyMTc5MjYwLCJ2ZXIiOiI0IiwidGlkIjoiMTQwODYzIiwicm53IjoxNzQyMTc5NTMxLCJybmV0aWQiOiIxODQ0MDQifQ.B7OD764_vh8qbScaQ-Oter_wOhAbL-joA58KKSuodGtBqUvEdip6O5HFV8FCj0VqT-ozpbieAKZTOCu6HVZGyg"
$refreshToken = "kdKtLwoAoGK15I8m8lH4gebKlz6_0_D-HluGDpdwv36L1z8kpYpRsj2YXU31WbF3Vgf_JqBAoYKCFXn9RAm4MTeFqtlqJhMPY05EvX2e1RGg2oScvVPlk1HxNcBov7iwfmVbGA"

docker stop twingate-connector
docker rm twingate-connector

docker run -d `
    --name twingate-connector `
    --restart unless-stopped `
    --privileged `
    --network host `
    --env TWINGATE_NETWORK=mansurmusa `
    --env TWINGATE_ACCESS_TOKEN=$accessToken `
    --env TWINGATE_REFRESH_TOKEN=$refreshToken `
    twingate/connector:1 