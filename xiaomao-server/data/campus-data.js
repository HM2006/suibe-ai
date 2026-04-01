/**
 * 校园模拟数据
 * 最小实现，确保服务器能启动
 */

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五'];

const campusMap = [
  { id: 1, name: '教学楼A', type: 'teaching', address: '松江校区', lat: 31.18, lng: 121.22 },
  { id: 2, name: '图书馆', type: 'library', address: '松江校区', lat: 31.19, lng: 121.23 },
  { id: 3, name: '食堂一楼', type: 'canteen', address: '松江校区', lat: 31.17, lng: 121.21 },
];

const schedule = { 0: [], 1: [], 2: [], 3: [], 4: [] };
const grades = [];
const library = [];
const news = [];
const services = [
  { name: '教务系统', url: 'https://nbkjw.suibe.edu.cn' },
  { name: '校园网', url: 'https://www.suibe.edu.cn' },
];

module.exports = {
  campusMap,
  schedule,
  WEEKDAYS,
  grades,
  library,
  news,
  services,
};
