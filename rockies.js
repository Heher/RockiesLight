const fetch = require('node-fetch');
const v3 = require('node-hue-api').v3;
const { DateTime } = require('luxon');
const { findBridgeAndApi } = require('./api');

const LightState = v3.lightStates.LightState;

let api;

const getLightsStatus = async () => {
  if (!api) {
    api = await findBridgeAndApi();
  }

  const rockiesLight = await api.lights.getLightByName("TV");
  const regularLight = await api.lights.getLightByName("Whiteboard");

  return { rockiesLight, regularLight };
}

const lightsAreOff = async () => {
  const {regularLight} = await getLightsStatus();

  return !regularLight._data.state.on;
}

const setRockiesLight = async () => {
  const { rockiesLight } = await getLightsStatus();

  const lightID = rockiesLight._data.id;

  const newState = new LightState().on().xy(0.199, 0.087);

  await api.lights.setLightState(lightID, newState);
}

const resetRockiesLight = async () => {
  const { rockiesLight, regularLight } = await getLightsStatus();

  const {bri, xy, on} = regularLight._data.state;

  const lightID = rockiesLight._data.id;

  const newState = new LightState().on(on).xy(xy).bri(bri);

  await api.lights.setLightState(lightID, newState);
}

const getGameInfo = async () => {
  const lightsOff = await lightsAreOff();

  if (lightsOff) {
    return;
  }

  const buff = new Buffer.from(`${process.env.MSF_API_KEY}:MYSPORTSFEEDS`, 'utf-8');
  const base64Data = buff.toString('base64');

  const date = DateTime.local();

  let correctDate = date;

  if (date.c.hour < 6) {
    correctDate = date.minus({ days: 1 });
  }

  const month = correctDate.c.month < 10 ? `0${correctDate.c.month}` : correctDate.c.month;
  let day = correctDate.c.day < 10 ? `0${correctDate.c.day}` : correctDate.c.day;

  const formattedDate = `${date.c.year}${month}${day}`;

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

  if (liveGame) {
    setRockiesLight();
  } else {
    resetRockiesLight();
  }
}

getGameInfo();
