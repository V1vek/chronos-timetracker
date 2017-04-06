import io from 'socket.io-client';
import storage from 'electron-json-storage';
import config from 'config';

import * as types from './constants';
import store from './store.js';

export default class Socket {
  static connect() {
    this.socket = io(config.socketUrl, {
      reconnection: true,
      reconnectionDelay: 200,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 99999,
    });
  }

  static login() {
    this.connect();
    console.log('Socket login');

    this.socket.on('connect', () => {
      setTimeout(() => {
        storage.get('desktop_tracker_jwt', (error, jwt) => {
          this.socket.emit('login', { jwt });
        });
      }, 2000);
    });

    this.socket.on('new settings', (response) => {
      console.log('new settings', response);
      store.dispatch({
        type: types.FILL_SETTINGS,
        payload: response.newSetting.desktopApp,
      });
    });

    this.socket.on('showCurrentWorklog', ({ toSocketId }) => {
      const state = store.getState();

      const running = state.timer.running;
      const issueId = state.issues.meta.trackingIssueId;
      const timeSpentSeconds = state.timer.time;
      const description = state.worklogs.meta.currentDescription;
      const screensShot =
        state.worklogs.meta.currentWorklogScreenshots.toArray().map(s => ({ name: s }));
      const userData = state.profile.userData;

      if (running) {
        this.socket.emit(
          'sendCurrentWorklog',
          {
            issueId,
            timeSpentSeconds,
            description,
            screensShot,
            toSocketId,
            user: userData.toJS(),
          },
        );
      }
    });
  }
}