/**
 * 天气路由模块
 * 代理和风天气 API，为前端提供实时天气和分钟级降水预报
 *
 * 配置说明：
 * 和风天气 V4 版本需要使用专属 API Host，请在控制台获取：
 * https://console.qweather.com/setting -> API Host
 * 格式如：abc1234xyz.def.qweatherapi.com
 *
 * 环境变量配置（推荐）：
 *   QWEATHER_API_HOST=你的专属API Host
 *   QWEATHER_API_KEY=你的API Key
 */

const express = require('express');
const axios = require('axios');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

const QWEATHER_API_HOST = process.env.QWEATHER_API_HOST || '9ca86aa0e64640588bf743b8b53dcd61.api.qweather.com';
const QWEATHER_API_KEY = process.env.QWEATHER_API_KEY || '9ca86aa0e64640588bf743b8b53dcd61';
const LOCATION = '121.23,31.03';

const QWEATHER_BASE_URL = `https://${QWEATHER_API_HOST}`;

const axiosConfig = {
  timeout: 8000,
  headers: {
    'X-QW-Api-Key': QWEATHER_API_KEY,
    'Accept-Encoding': 'gzip, deflate',
  },
  decompress: true,
};

router.get('/weather/now', asyncHandler(async (req, res) => {
  const { data } = await axios.get(`${QWEATHER_BASE_URL}/v7/weather/now`, {
    ...axiosConfig,
    params: { location: LOCATION, lang: 'zh' },
  });
  if (data.code !== '200') {
    throw new AppError(`和风天气接口返回错误: ${data.code}`, 502, 'UPSTREAM_ERROR');
  }
  const now = data.now;
  res.json({
    success: true,
    data: {
      location: LOCATION, temp: now.temp, feelsLike: now.feelsLike,
      icon: now.icon, text: now.text, wind360: now.wind360,
      windDir: now.windDir, windScale: now.windScale, windSpeed: now.windSpeed,
      humidity: now.humidity, precip: now.precip, pressure: now.pressure,
      vis: now.vis, cloud: now.cloud, dew: now.dew, obsTime: now.obsTime,
    },
  });
}));

router.get('/weather/minutely', asyncHandler(async (req, res) => {
  const { data } = await axios.get(`${QWEATHER_BASE_URL}/v7/minutely/5m`, {
    ...axiosConfig,
    params: { location: LOCATION, lang: 'zh' },
  });
  if (data.code !== '200') {
    throw new AppError(`和风天气接口返回错误: ${data.code}`, 502, 'UPSTREAM_ERROR');
  }
  res.json({
    success: true,
    data: {
      location: LOCATION,
      summary: data.summary,
      minutely: (data.minutely || []).map(item => ({
        time: item.fxTime, precip: item.precip, type: item.type,
      })),
    },
  });
}));

module.exports = router;
