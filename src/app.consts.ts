import { createClient } from 'redis';

export const redisClient = createClient({
  password: 'sbnpgA8OwzieIsykl2aZkgf61KGDjeUy',
  socket: {
    host: 'redis-16231.c322.us-east-1-2.ec2.cloud.redislabs.com',
    port: 16231,
  },
}).on('error', (err) => {
  throw err;
});
export const APP_ID = '8c0e34537b24401ebe53e202cea1b299';
export const APP_CERTIFICATE = '44b8896902a64308ab27fd360252b1e9';

export const RoomStatus = {
  ONGOING: 'ongoing',
  SCHEDULED: 'scheduled'
}