import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import { tooltip, tooltipStore } from '../src/lib/tooltip.js';
import { uiOpen, config } from '../src/lib/stores.js';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  uiOpen.set(true);
  config.update(value => ({ ...value, tooltipsEnabled: true }));
  tooltipStore.set({ visible: false, text: '', x: 0, y: 0 });
  const actions = [];
  t.after(() => {
    actions.forEach(action => action.destroy());
    uiOpen.set(false);
  });
  return {
    node(text = 'Play') {
      const node = new EventTarget();
      node.isConnected = true;
      const action = tooltip(node, text);
      actions.push(action);
      return { node, action };
    },
    tick: (ms = 300) => t.mock.timers.tick(ms),
  };
}

function mouse(node, type, x = 10, y = 20) {
  const event = new Event(type);
  Object.assign(event, { clientX: x, clientY: y });
  node.dispatchEvent(event);
}

test('shows after the hover delay, follows the cursor and hides on leave', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  tick(299);
  assert.equal(get(tooltipStore).visible, false);
  tick(1);
  assert.equal(get(tooltipStore).text, 'Play');
  mouse(trigger.node, 'mousemove', 50, 60);
  assert.deepEqual(get(tooltipStore), { visible: true, text: 'Play', x: 50, y: 60 });
  mouse(trigger.node, 'mouseleave');
  assert.equal(get(tooltipStore).visible, false);
});

test('closing the UI hides an already visible tooltip without mouseleave', t => {
  const { node, tick } = setup(t);
  mouse(node().node, 'mouseenter');
  tick();
  uiOpen.set(false);
  assert.equal(get(tooltipStore).visible, false);
});

test('closing and quickly reopening cancels pending tooltips', t => {
  const { node, tick } = setup(t);
  mouse(node().node, 'mouseenter');
  tick(100);
  uiOpen.set(false);
  uiOpen.set(true);
  tick();
  assert.equal(get(tooltipStore).visible, false);
});

test('removing the hovered trigger hides its visible tooltip', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  tick();
  trigger.action.destroy();
  assert.equal(get(tooltipStore).visible, false);
});

test('removing a trigger cancels its pending hover timer', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  trigger.action.destroy();
  tick();
  assert.equal(get(tooltipStore).visible, false);
});

test('disabling tooltips hides visible hints and cancels pending hints', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  tick();
  config.update(value => ({ ...value, tooltipsEnabled: false }));
  assert.equal(get(tooltipStore).visible, false);
  config.update(value => ({ ...value, tooltipsEnabled: true }));
  mouse(trigger.node, 'mouseenter');
  config.update(value => ({ ...value, tooltipsEnabled: false }));
  config.update(value => ({ ...value, tooltipsEnabled: true }));
  tick();
  assert.equal(get(tooltipStore).visible, false);
});

test('clearing the tooltip text cancels a pending hover', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  trigger.action.update('');
  tick();
  assert.equal(get(tooltipStore).visible, false);
});

test('a tooltip cannot appear while the UI is closed or tips are disabled', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  uiOpen.set(false);
  mouse(trigger.node, 'mouseenter');
  tick();
  assert.equal(get(tooltipStore).visible, false);
  uiOpen.set(true);
  config.update(value => ({ ...value, tooltipsEnabled: false }));
  mouse(trigger.node, 'mouseenter');
  tick();
  assert.equal(get(tooltipStore).visible, false);
});

test('leaving or destroying another trigger does not dismiss the current tooltip', t => {
  const { node, tick } = setup(t);
  const first = node('First');
  const second = node('Second');
  mouse(first.node, 'mouseenter');
  mouse(second.node, 'mouseenter');
  tick();
  mouse(first.node, 'mouseleave');
  first.action.destroy();
  assert.equal(get(tooltipStore).text, 'Second');
  assert.equal(get(tooltipStore).visible, true);
});

test('a new hover works after closing and reopening the UI', t => {
  const { node, tick } = setup(t);
  const trigger = node();
  mouse(trigger.node, 'mouseenter');
  tick();
  uiOpen.set(false);
  uiOpen.set(true);
  mouse(trigger.node, 'mouseenter');
  tick();
  assert.equal(get(tooltipStore).visible, true);
  trigger.action.update('Pause');
  assert.equal(get(tooltipStore).text, 'Pause');
});
