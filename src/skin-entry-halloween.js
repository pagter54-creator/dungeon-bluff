// Refresh only the cosmetic catalog before the existing application starts.
// Previously visited browsers may retain unversioned ES modules after a release.
import {SKINS} from './skins.js';
import {COSMETIC_ASSETS} from './cosmetics.js';
const {SKINS:releasedSkins}=await import(new URL('./skins.js?release=railway-20261008',import.meta.url).href);
Object.assign(SKINS,releasedSkins);
Object.assign(COSMETIC_ASSETS,releasedSkins);
await import('./app.js');

