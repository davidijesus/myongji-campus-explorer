import { GeographicFix } from './geographic';

export type LocationPhase='idle'|'requesting'|'active'|'denied'|'unavailable'|'timeout'|'paused'|'stale';
/** Foreground-only, in-memory W3C geolocation. The UI owns the explicit user intent. */
export class ForegroundLocation {
 private watch:number|null=null;
 private generation=0;
 private expiry:number|undefined;
 constructor(private provider:Geolocation|undefined,private onFix:(fix:GeographicFix|null)=>void,private onState:(phase:LocationPhase)=>void){}
 start(){
  this.stop('idle');
  if(!this.provider){this.onState('unavailable');return;}
  const generation=++this.generation;
  this.onState('requesting');
  this.expiry=window.setTimeout(()=>{if(generation===this.generation)this.stop('timeout');},20000);
  try{
   const id=this.provider.watchPosition(position=>{
    if(generation!==this.generation)return;
    const {latitude:lat,longitude:lon,accuracy:accuracyM}=position.coords;
    const timestamp=position.timestamp;
    if(![lat,lon,accuracyM,timestamp].every(Number.isFinite)||Math.abs(lat)>90||Math.abs(lon)>180||accuracyM<=0){this.stop('unavailable');return;}
    const age=Date.now()-timestamp;
    if(age>60000||age< -10000){this.stop('stale');return;}
    clearTimeout(this.expiry);
    this.expiry=window.setTimeout(()=>{if(generation===this.generation)this.stop('stale');},Math.max(1,60000-age));
    this.onState('active');
    this.onFix({lat,lon,accuracyM,timestamp});
   },error=>{
    if(generation!==this.generation)return;
    this.stop(error.code===1?'denied':error.code===3?'timeout':'unavailable');
   },{enableHighAccuracy:true,maximumAge:0,timeout:15000});
   // A mock or implementation may invoke a callback synchronously.
   if(generation===this.generation)this.watch=id;else this.provider.clearWatch(id);
  }catch{this.stop('unavailable');}
 }
 stop(phase:LocationPhase='idle'){
  ++this.generation;clearTimeout(this.expiry);this.expiry=undefined;
  if(this.watch!==null){this.provider?.clearWatch(this.watch);this.watch=null;}
  this.onFix(null);this.onState(phase);
 }
 dispose(){this.stop();}
}
