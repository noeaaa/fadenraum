export const pattern=/\[\[([^\]\n]+)\]\]/g;
const legacySeed=[
 ['Spitze im Gegenlicht','Auf der Manschette liegt Weiß über Weiß. Die Blüte wird dort sichtbar, wo das Netz Licht durchlässt. Ich möchte diesen Wechsel aus Dichte und Luft als Oberfläche für Gedanken verwenden.\n\nDie Ranke führt zur [[Stuckkante]]. Die wiederkehrenden Maschen erinnern mich an [[System und Gefühl]].'],
 ['Stuckkante','In der Altbauwohnung interessiert mich der Übergang zwischen Wand und Decke. Die freie Fläche lässt der kleinen, eingeschnittenen Ranke Platz. Ich sehe dasselbe Prinzip in der [[Spitze im Gegenlicht]].\n\nEin Raum, in dem ich gern einen [[Wintermorgen]] verbringen würde.'],
 ['Wintermorgen','Draußen liegt die Straße im Nebel. Drinnen fällt graues Licht auf zerknittertes Leinen. Kälte in der äußeren Welt und Wärme im persönlichen Raum können im selben Bild liegen.\n\nDazu passt die [[Bewohnte Ordnung]].'],
 ['Bewohnte Ordnung','Hohe Fenster, wenige Dinge, ein Bett, das noch die vergangene Nacht zeigt. In einem präzise proportionierten Raum fällt mir diese eine zufällige Falte besonders auf.\n\nAus der Falte wird eine Linie für [[System und Gefühl]].'],
 ['System und Gefühl','Im Systems Engineering frage ich, wie Kräfte, Formen und Materialien zusammenwirken. Beim Betrachten eines Stoffes frage ich auch, weshalb mich gerade diese Falte berührt. Hier kann ich beiden Fragen nachgehen.\n\nProjektidee: ein [[Eigenes Notizwerkzeug]].'],
 ['Abends sammeln','Musik läuft, und zwischen zwei Bildern bleibt manchmal etwas hängen: eine nasse Straße, ein stilles Fenster, ein genauer Schnitt am Ärmel. Auf meinem Board entdecke ich später, welche Dinge ich wiederholt gewählt habe.\n\nEine Stimmung daraus ist der [[Wintermorgen]].'],
 ['Eigenes Notizwerkzeug','Eine Rose für jede Notiz. Was passiert, wenn die Verbindungen zwischen Gedanken wirklich als Fäden sichtbar werden? Ich möchte eigene Ideen so ordnen, dass ich gern zu ihnen zurückkehre.\n\nDer Ausgangspunkt ist [[Abends sammeln]]. Die Form kommt von der [[Spitze im Gegenlicht]].'],
 ['Gestaltungsfreiheit','Ich möchte etwas Eigenes aufbauen und selbst entscheiden können, wie es aussieht, funktioniert und sich anfühlt. Ein erster Versuch ist mein [[Eigenes Notizwerkzeug]].']
];
const seed=[
 ['Lace against light','White thread on a white cuff. The flower appears where the light passes through the open stitches. I keep finding the same change of scale in a [[Plaster cornice]].'],
 ['Plaster cornice','Most of the wall is quiet. A carved tendril at the ceiling gives the eye somewhere to linger. I imagine seeing it first thing on a [[Winter morning]].'],
 ['Winter morning','Outside, fog softens the street. Inside, grey light falls across rumpled linen. The room holds both temperatures at once. See [[An inhabited room]].'],
 ['An inhabited room','Tall windows, a few objects, a bed still creased from the night. Against the proportions of the room, one accidental fold is enough to catch my eye. It becomes a curve in [[Systems and feeling]].'],
 ['Systems and feeling','Engineering makes me curious about how a fold carries its weight. Looking at fabric also makes me wonder why that particular line stays with me. Both questions belong in [[A notebook of my own]].'],
 ['Collecting at dusk','Music plays while I look through images. A wet street, a quiet window, the cut of a sleeve. Sometimes a [[Winter morning]] keeps appearing long before I notice the pattern.'],
 ['A notebook of my own','A rose for each note, a thread between thoughts. My evening habit of [[Collecting at dusk]] meets the open structure of [[Lace against light]].'],
 ['Freedom to make','I want to build something of my own and decide how it looks, works and feels. One small beginning is [[A notebook of my own]].']
];
export function ownNote(n){return n.origin ? n.origin!=='seed' : !legacySeed.some(([title,body])=>title===n.title&&body===n.body)}
export function titleOf(path){return path.split('/').at(-1).replace(/\.(md|markdown)$/i,'')}
export function safePath(p){return p.replaceAll('\\','/').split('/').filter(s=>s&&s!=='.'&&s!=='..').join('/').normalize('NFC')}
export const normalize=s=>s.normalize('NFC').toLowerCase();
export function target(raw,notes,from){
 const spec=raw.split('|')[0].split('#')[0].trim().replace(/\.(md|markdown)$/i,'');
 if(!spec)return from;
 const key=normalize(spec),folder=from.path.split('/').slice(0,-1);
 const resolved=[...folder];for(const part of spec.split('/')){if(part==='..')resolved.pop();else if(part&&part!=='.')resolved.push(part)}
 for(const name of [resolved.join('/'),spec]){const match=notes.find(n=>normalize(n.path.replace(/\.(md|markdown)$/i,''))===normalize(name));if(match)return match}
 const matches=notes.filter(n=>normalize(n.title)===key);return matches.length===1?matches[0]:null;
}
export async function openArchive(){
 const db=await new Promise((ok,fail)=>{const req=indexedDB.open('fadenraum-notizgewebe',1);req.onupgradeneeded=()=>{const store=req.result.createObjectStore('notes',{keyPath:'id'});for(const [title,body] of seed)store.add({id:crypto.randomUUID(),title,body,origin:'seed',path:title+'.md'})};req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error)});
 return {
 list:()=>new Promise((ok,fail)=>{const r=db.transaction('notes').objectStore('notes').getAll();r.onsuccess=()=>ok(r.result.sort((a,b)=>a.path.localeCompare(b.path,'de')));r.onerror=()=>fail(r.error)}),
 save:(put=[],remove=[])=>new Promise((ok,fail)=>{const tx=db.transaction('notes','readwrite'),store=tx.objectStore('notes');for(const id of remove)store.delete(id);for(const n of put)store.put(n);tx.oncomplete=ok;tx.onabort=()=>fail(tx.error);tx.onerror=()=>fail(tx.error)})
 };
}
