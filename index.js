require("dotenv").config();
const express = require("express");
const { GoogleAdsApi, enums } = require("google-ads-api");
const app = express();
const port = 3000;

const {
  CLIENT_ID,
  CLIENT_SECRET,
  DEVELOPER_TOKEN,
  CUSTOMER_ACCOUNT_ID,
  REFRESH_TOKEN,
  LOGIN_CUSTOMER_ID,
} = process.env;

const client = new GoogleAdsApi({
  client_id: CLIENT_ID /* Client ID */,
  client_secret: CLIENT_SECRET /* Client secret */,
  developer_token: DEVELOPER_TOKEN /* Developer token from google ads account */,
});

const customer = client.Customer({
  customer_account_id: CUSTOMER_ACCOUNT_ID /* Customer account id which we get from test manager account */,
  refresh_token: REFRESH_TOKEN /* Google account refresh token with adword permission */,
  login_customer_id: LOGIN_CUSTOMER_ID /* Test manager account id */,
});

/* Random number code to add suffix for unique name */

function getRndInteger() {
  return Math.floor(Math.random() * (1000000000000 - 1 + 1)) + 1;
}

/* Main route */
/* We require 4 steps to create a keyword search */

app.get("/", function (req, res, next) {
  if (!req.query.text) {
    res.send("Please send a keyword 'text' !");
  } else {
    const keyword_plan = {
      forecast_period: { date_interval: 4 },
      name: "HawkVision" + getRndInteger(),
    };

    /* step 1 : Create keyword Plans  */

    return (
      customer.keywordPlans
        .create(keyword_plan)
        .then((data) => {
          if (!data) {
            throw new Error("No data!");
          }

          // console.log("data 1 ::", data);

          const { results } = data;

          if (!results[0]) {
            throw new Error("No results!");
          }
          
          const forecastId = results[0].split("/")[3];

          if (!forecastId) {
            throw new Error("Invalid information!");
          }

          const keyword_plan2 = {
            name: "HawkVision" + getRndInteger(),
            cpc_bid_micros: 1000000,
            keyword_plan_network: 2,
            keyword_plan: results[0],
          };

          /* Step 2 : Create keyword plan campaigns using above resource_name that is basically
           a link which we are getting in result */

          return customer.keywordPlanCampaigns
            .create(keyword_plan2)
            .then((data) => {
              if (!data) {
                throw new Error("No data!");
              }

              // console.log("data 2 ::", data);

              const { results } = data;

              if (!results[0]) {
                throw new Error("No results!");
              }

              const keyword_plan3 = {
                name: "HawkVision" + getRndInteger(),
                cpc_bid_micros: 2500000,
                keyword_plan_campaign: results[0],
              };

              /* Step 3 : Create keyword plan adgroups with above result  */

              return customer.keywordPlanAdGroups
                .create(keyword_plan3)
                .then((data) => {
                  if (!data) {
                    throw new Error("No data!");
                  }

                  // console.log("data 3 ::", data);

                  const { results } = data;

                  if (!results[0]) {
                    throw new Error("No results!");
                  }

                  const keyword_plan4 = {
                    text: req.query.text,
                    cpc_bid_micros: 2000000,
                    match_type: 4,
                    keyword_plan_ad_group: results[0],
                  };

                  /* Step 4 : Create adgroup keyword using above link and keyword text is set */

                  return customer.keywordPlanAdGroupKeywords
                    .create(keyword_plan4)
                    .then((data) => {
                      if (!data) {
                        throw new Error("No data!");
                      }

                      // console.log("data 4 ::", data);

                      /* Get forecast data */

                      return customer.keywordPlans
                        .generateForecastMetrics(forecastId)
                        .then((data) => {
                          if (!data) {
                            throw new Error("No data!");
                          }

                          const {
                            campaign_forecasts,
                            ad_group_forecasts,
                            keyword_forecasts,
                          } = data;

                          if (
                            !campaign_forecasts &&
                            !ad_group_forecasts &&
                            !keyword_forecasts
                          ) {
                            throw new Error("No forecast value!");
                          }

                          console.log(
                            "campaign_forecasts ::",
                            campaign_forecasts
                          );
                          console.log(
                            "ad_group_forecasts ::",
                            ad_group_forecasts
                          );
                          console.log(
                            "keyword_forecasts ::",
                            keyword_forecasts
                          );

                          /* Get historic metrics data */

                          return customer.keywordPlans
                            .generateHistoricalMetrics(forecastId)
                            .then((data) => {
                              if (!data) {
                                throw new Error("No data!");
                              }
                              const { metrics } = data;
                              if (!metrics[0].keyword_metrics) {
                                throw new Error("No metrics formed!");
                              }
                              console.log("HistoricalMetrics ::", data);
                              console.log(
                                "keyword_metrics ::",
                                metrics[0].keyword_metrics
                              );
                              res.send({
                                Forecast: campaign_forecasts,
                                Historic: data,
                              });

                              /* Delete keyword plan */

                              customer.keywordPlans
                                .delete(forecastId)
                                .then((data) => {
                                  if (!data) {
                                    throw new Error("No data!");
                                  }
                                  console.log("FINISH ::", data);
                                });
                            });
                        });
                    });
                });
            });
        })
        /* Error handler */
        .catch((err) => {
          res.send("Some error, Please try again !");
        })
    );
  }
});

/* Listen code */
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
