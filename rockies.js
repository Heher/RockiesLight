const fetch = require('node-fetch');
const v3 = require('node-hue-api').v3;
const { findBridgeAndApi } = require('./api');

const LightState = v3.lightStates.LightState;

let api;

const setRockiesLight = async () => {
  if (!api) {
    api = await findBridgeAndApi();
  }

  const light = await api.lights.getLightByName("TV");
  const lightID = light._data.id;

  const newState = new LightState().on().xy(0.199, 0.087);

  await api.lights.setLightState(lightID, newState);
}

const resetRockiesLight = async () => {
  if (!api) {
    api = await findBridgeAndApi();
  }

  const rockiesLight = await api.lights.getLightByName("TV");
  const regularLight = await api.lights.getLightByName("Whiteboard");

  const {bri, xy, on} = regularLight._data.state;

  const lightID = rockiesLight._data.id;

  const newState = new LightState().on(on).xy(xy).bri(bri);

  await api.lights.setLightState(lightID, newState);
}

const getGameInfo = async () => {
  const buff = new Buffer.from(`${process.env.MSF_API_KEY}:MYSPORTSFEEDS`, 'utf-8');
  const base64Data = buff.toString('base64');

  const today = new Date();
  let date = ("0" + today.getDate()).slice(-2);
  let month = ("0" + (today.getMonth() + 1)).slice(-2);
  let year = today.getFullYear();
  
  const formattedDate = year + month + date;

  const url = `https://api.mysportsfeeds.com/v2.1/pull/mlb/current/date/${formattedDate}/games.json?`;

  const params = new URLSearchParams({
    team: 'colorado-rockies'
  });
  
  const response = await fetch(url + params, {
    headers: {
      Authorization: `Basic ${base64Data}`
    }
  });

  const json = await response.json();

  let liveGame = false;

  json.games.forEach(game => {
    if (game.schedule.playedStatus === 'LIVE') {
      liveGame = true;
    }
  })

  console.log(json.games);
  console.log(liveGame);

  if (liveGame) {
    setRockiesLight();
  } else {
    resetRockiesLight();
  }
}

getGameInfo();
