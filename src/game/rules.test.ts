import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getXpRequiredForLevel,
  createInitialCharacter,
  calculateDamage,
  addExperience,
  updateWarMomentum,
  BASE_XP_REQ,
  MAX_LEVEL,
} from './rules';

test('XP calculation scales with level and terminates at max level', () => {
  const lvl1Xp = getXpRequiredForLevel(1);
  assert.equal(lvl1Xp, BASE_XP_REQ);
  const lvl2Xp = getXpRequiredForLevel(2);
  assert.ok(lvl2Xp > lvl1Xp);
  assert.equal(getXpRequiredForLevel(MAX_LEVEL), Infinity);
});

test('Character creation initializes proper faction stats and starter abilities', () => {
  const devaHero = createInitialCharacter('Arjuna', 'DEVAS', 'VAJRA_WARRIOR');
  assert.equal(devaHero.name, 'Arjuna');
  assert.equal(devaHero.faction, 'DEVAS');
  assert.equal(devaHero.level, 1);
  assert.equal(devaHero.abilities.length, 4);
  assert.equal(devaHero.abilities[0].unlockedAtLevel, 1);
  assert.equal(devaHero.abilities[3].unlockedAtLevel, 4);

  const asuraHero = createInitialCharacter('Mahisha', 'ASURAS', 'MAHISHA_BERSERKER');
  assert.equal(asuraHero.faction, 'ASURAS');
  assert.ok(asuraHero.stats.hp > 200);
});

test('Damage formula accounts for defense and critical multipliers', () => {
  const normalHit = calculateDamage(50, 10, false, 1.5, 1.0);
  assert.ok(normalHit.damage > 0);
  assert.equal(normalHit.isCrit, false);

  const critHit = calculateDamage(50, 10, true, 2.0, 1.0);
  assert.ok(critHit.damage > normalHit.damage * 1.5);
  assert.equal(critHit.isCrit, true);
});

test('Experience addition levels up character and upgrades stats', () => {
  const hero = createInitialCharacter('TestHero', 'DEVAS', 'SURYA_ARCHER');
  const baseMaxHp = hero.stats.maxHp;
  const baseAtk = hero.stats.atk;

  const result = addExperience(hero, 150);
  assert.equal(result.leveledUp, true);
  assert.equal(result.levelsGained, 1);
  assert.equal(result.updatedChar.level, 2);
  assert.ok(result.updatedChar.stats.maxHp > baseMaxHp);
  assert.ok(result.updatedChar.stats.atk > baseAtk);
});

test('War momentum updates correctly towards victory target', () => {
  const initialWar = {
    devaMomentum: 100,
    asuraMomentum: 100,
    targetMomentum: 500,
    devaKills: 20,
    asuraKills: 20,
    elapsedSeconds: 60,
    battleStatus: 'PLAYING' as const,
  };

  const updated = updateWarMomentum(initialWar, 'DEVAS', 400);
  assert.equal(updated.devaMomentum, 500);
  assert.equal(updated.battleStatus, 'DEVA_VICTORY');
});
