import App from './App.svelte';
import './styles/global.css';
import { mount } from 'svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Missing #app mount node');
}

const app = mount(App, { target });

export default app;
