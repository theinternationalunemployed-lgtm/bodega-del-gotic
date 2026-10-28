import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsFor, madridNow, addMinutes, addDays } from './time.js';

const hours = [
  { weekday: 1, opens: '09:00:00', closes: '23:30:00' },
  { weekday: 6, opens: '10:00:00', closes: '23:30:00' },
];
const settings = { slot_minutes: 30, duration_minutes: 90 };
const now = { date: '2026-11-02', time: '20:10' }; // lunes

test('día futuro: de apertura hasta cierre menos la duración', () => {
  const s = slotsFor('2026-11-09', hours, settings, now); // lunes siguiente
  assert.equal(s[0], '09:00');
  assert.equal(s.at(-1), '22:00');
  assert.equal(s.length, 27);
});

test('hoy: solo franjas posteriores a la hora actual', () => {
  assert.deepEqual(slotsFor('2026-11-02', hours, settings, now), ['20:30', '21:00', '21:30', '22:00']);
});

test('domingo cerrado y días pasados vacíos', () => {
  assert.deepEqual(slotsFor('2026-11-08', hours, settings, now), []);
  assert.deepEqual(slotsFor('2026-10-26', hours, settings, now), []);
});

test('hora de Barcelona con cambio de horario', () => {
  assert.deepEqual(madridNow(new Date('2026-07-01T19:00:00Z')), { date: '2026-07-01', time: '21:00' });
  assert.deepEqual(madridNow(new Date('2026-12-31T23:30:00Z')), { date: '2027-01-01', time: '00:30' });
});

test('aritmética de horas y fechas', () => {
  assert.equal(addMinutes('21:30', 90), '23:00');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
