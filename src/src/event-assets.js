// Stable event IDs map to user-supplied PNGs. No database requests required.
export const EVENT_IMAGES = {
  pressure_plate: new URL('../monster/01_압력판 회랑.png', import.meta.url).href,
  overload_device: new URL('../monster/02_과부하 장치.png', import.meta.url).href,
  twin_statues: new URL('../monster/03_쌍둥이 석상.png', import.meta.url).href,
  collapsing_bridge: new URL('../monster/04_붕괴하는 다리.png', import.meta.url).href,
  greedy_chest: new URL('../monster/05_탐욕의 상자.png', import.meta.url).href,
  humble_chest: new URL('../monster/06_겸손한 상자.png', import.meta.url).href,
  balance_vault: new URL('../monster/07_균형의 보물고.png', import.meta.url).href,
  cursed_safe: new URL('../monster/08_저주받은 금고.png', import.meta.url).href,
  healing_spring: new URL('../monster/09_치유의 샘.png', import.meta.url).href,
  shared_supplies: new URL('../monster/10_공동 식량 창고.png', import.meta.url).href,
  field_clinic: new URL('../monster/11_야전 치료소.png', import.meta.url).href,
  suspicious_merchant: new URL('../monster/12_수상한 상인.png', import.meta.url).href,
  gamblers_altar: new URL('../monster/13_도박꾼의 제단.png', import.meta.url).href,
  ancient_gate: new URL('../monster/14_고대의 문.png', import.meta.url).href,
  suspicious_offer: new URL('../monster/15_수상한 제안.png', import.meta.url).href,
  truce_offer: new URL('../monster/16_휴전 제안.png', import.meta.url).href,
};
