import App from './App.svelte';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './styles/global.css';
import { mount } from 'svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('Missing #app mount node');
}

const app = mount(App, { target });

export default app;
