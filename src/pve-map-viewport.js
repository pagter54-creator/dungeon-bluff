// Realtime voting redraws the overlay. Remember both axes per run/floor.
export function createPveMapViewport(){
 const positions=new Map();
 return {
  capture(root){const node=root.querySelector('.pve-map-scroll');if(node?.dataset.mapKey)positions.set(node.dataset.mapKey,{top:node.scrollTop,left:node.scrollLeft});},
  restore(root){const node=root.querySelector('.pve-map-scroll'),saved=node&&positions.get(node.dataset.mapKey);if(saved){node.scrollTop=saved.top;node.scrollLeft=saved.left;}},
  clear(){positions.clear();}
 };
}
