// index.js
import { registerRootComponent } from 'expo';
import App from './App';

// O registerRootComponent cuida de otimizações e do ciclo de vida no Expo
registerRootComponent(App);