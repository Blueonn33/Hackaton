(function () {
"use strict";
// Данните идват от ASP.NET: /data/map.json (граници) и /api/dataset (база данни).
function fail(msg) {
  var i = document.getElementById("info");
  if (i) i.innerHTML = '<p class="empty">' + msg + '</p>';
}

function boot(MAP, X) {
var D = X.d, CODE = X.code, RCODE = X.rCode, ACT = X.act, AZ = X.azReal, AZ_NAT = X.azNat,
    NAMES = X.names, AZA = X.azAll, PS = X.ps;
var IND={k1564:"Коефициент на заетост, 15–64 г.",k15:"Коефициент на заетост, 15+ г.",emp:"Заети лица, хиляди"};
var SEXN=["Общо","Мъже","Жени"],PERN={"2026Q1":"Q1 2026","2026Q2":"Q2 2026"};
var NI="няма информация";
var N2C={};Object.keys(CODE).forEach(function(k){N2C[k]=CODE[k]});Object.keys(RCODE).forEach(function(k){N2C[k]=RCODE[k]});
var $=function(i){return document.getElementById(i)};
var S={ind:"k1564",sex:0,per:"2026Q2",lvl:"obl",sel:null,hov:null};
function f(n,d){return n.toFixed(d).replace(".",",")}
function sg(x,d,u){return (x>=0?"+":"−")+f(Math.abs(x),d)+u}
var DS=Object.keys(MAP.paths),RS=Object.keys(RCODE);
function pnat(i){var a=0,b=0;DS.forEach(function(d){var e=D[CODE[d]]["2026Q2"].emp[0];a+=e*PS[d][i];b+=e});return a/b}
function isDemo(e){return isProf()||(isAz()&&AZ[e]===undefined)}
var TAG='<span class="tag">ДЕМО</span>';
function isAz(){return S.ind==="az"}
function isProf(){return typeof S.ind==="number"}
function isNsi(){return !isAz()&&!isProf()}
function lv(){return isNsi()?S.lvl:"obl"}
function ent(d){return lv()==="reg"?MAP.membership[d]:d}
function ents(){return lv()==="reg"?RS:DS}
function gv(e,ind,sex,per){return D[N2C[e]||e][per][ind][sex]}
function val(e){if(isAz())return AZA[e];if(isProf())return PS[e][S.ind];return gv(e,S.ind,S.sex,S.per)}
function fv(v){return S.ind==="emp"?f(v,1)+" хил.":f(v,isAz()?2:1)+"%"}
function dom(){var v=ents().map(val).filter(function(x){return x!==null});return v.length?[Math.min.apply(null,v),Math.max.apply(null,v)]:null}
function rankOf(e){var a=ents().filter(function(x){return val(x)!==null}).sort(function(a,b){return val(b)-val(a)});return [a.indexOf(e)+1,a.length]}
function natv(){return D.BG[S.per][S.ind][S.sex]}
function build(){
  var o='<optgroup label="НСИ, Наблюдение на работната сила">';
  Object.keys(IND).forEach(function(k){o+='<option value="'+k+'">'+IND[k]+'</option>'});
  o+='</optgroup><optgroup label="Агенция по заетостта"><option value="az">Регистрирана безработица, април 2026 (6 реални + 22 ДЕМО области)</option></optgroup><optgroup label="Дял от заетите по професия (ДЕМО данни)">';
  NAMES.forEach(function(n,i){o+='<option value="'+i+'">'+n+' (ДЕМО)</option>'});
  $("metric").innerHTML=o+'</optgroup>';
  var b="";ACT.slice(1).sort(function(a,c){return c[1][0]-a[1][0]}).forEach(function(r){b+=ar(r)});
  $("act").innerHTML=ar(ACT[0],1)+b;

}
var AMX=0;
function ar(r,t){if(!AMX)AMX=Math.max.apply(null,ACT.slice(1).map(function(x){return x[1][0]}));
  var c=function(v){return '<td class="num">'+f(v[0],1)+(v[1]?'*':'')+'</td>'};
  return '<tr'+(t?' class="nat"':'')+'><td>'+r[0]+'</td><td style="min-width:120px"><span class="bar"><i style="width:'+(t?100:r[1][0]/AMX*100)+'%"></i></span></td>'+c(r[1])+c(r[2])+c(r[3])+'</tr>';
}
function syncCtl(){var n=isNsi();$("sex").disabled=!n;$("per").disabled=!n;$("lvl").disabled=!n}
$("metric").onchange=function(){var v=this.value;S.ind=(v==="az"||v==="emp"||v==="k15"||v==="k1564")?v:+v;S.sel=null;S.hov=null;syncCtl();render()};
$("sex").onchange=function(){S.sex=+this.value;render()};
$("per").onchange=function(){S.per=this.value;render()};
$("lvl").onchange=function(){S.lvl=this.value;S.sel=null;S.hov=null;render()};
function drawMap(){
  var d=dom(),h="";
  DS.forEach(function(n){
    var e=ent(n),v=val(e),st="",cl="d";
    if(v===null){cl+=" nd"}else{var t=d[1]>d[0]?(v-d[0])/(d[1]-d[0]):0;st=' style="fill:color-mix(in srgb,var(--hi) '+Math.round(t*100)+'%,var(--lo))"'}
    if(S.sel===e)cl+=" on";
    if(isDemo(e))cl+=" demo";
    h+='<path class="'+cl+'" data-d="'+n+'" tabindex="0" role="button" aria-label="'+e+': '+(v===null?NI:fv(v))+'"'+st+' d="'+MAP.paths[n]+'"><title>'+n+(lv()==="reg"?' ('+e+' район)':'')+'</title></path>';
  });
  $("map").innerHTML=h;

  $("legend").style.display=d?"flex":"none";
  if(d){$("lmin").textContent=fv(d[0]);$("lmax").textContent=fv(d[1])}
}
function mini(e){
  var c=N2C[e],p=S.per,h='<table class="mini"><thead><tr><th></th><th class="num">Общо</th><th class="num">Мъже</th><th class="num">Жени</th></tr></thead><tbody>';
  [["k15","Заетост 15+ г."],["k1564","Заетост 15–64 г."],["emp","Заети, хил."]].forEach(function(r){
    h+='<tr><th>'+r[1]+'</th>'+D[c][p][r[0]].map(function(x,i){return '<td class="num'+(r[0]===S.ind&&i===S.sex?' hl':'')+'">'+f(x,1)+(r[0]==="emp"?'':'%')+'</td>'}).join('')+'</tr>'});
  return h+'</tbody></table>';
}
function drawInfo(){
  var n=S.hov||S.sel,el=$("info");
  if(!n){
    var t;
    if(isNsi()){var nv=natv();t='Цветът показва: '+IND[S.ind].toLowerCase()+', '+SEXN[S.sex].toLowerCase()+', '+PERN[S.per]+'. '+(S.ind==="emp"?'Общо за страната: ':'Средно за страната: ')+fv(nv)+'.'+(lv()==="reg"?' Картата е оцветена по статистически райони (NUTS 2).':'')}
    else if(isAz())t="Цветът показва регистрираната безработица, април 2026. Пунктираните области са ДЕМО. Средно за страната: "+f(AZ_NAT,2)+"%.";
    else t="Цветът показва дела на избраната професия сред заетите (ДЕМО данни). Средно за страната (претеглено): "+f(pnat(S.ind),1)+"%.";
    el.innerHTML='<p class="empty">Посочете област на картата. '+t+'</p>';return}
  var isR=RCODE[n]!==undefined,h='<h3>'+(isR?n+' район':n)+'</h3><p class="m">'+(isR?'Статистически район (NUTS 2), '+DS.filter(function(d){return MAP.membership[d]===n}).length+' области':MAP.membership[n]+' район')+'</p>';
  if(isProf()){var pv=PS[n][S.ind],pk=rankOf(n),pn=pnat(S.ind),emp=D[CODE[n]]["2026Q2"].emp[0];
    h+='<div class="big">'+f(pv,1)+'% '+TAG+'</div><p>'+NAMES[S.ind]+': дял от заетите, '+pk[0]+'-о място от '+pk[1]+' ('+sg(pv-pn,1,' пр. п.')+' спрямо средното за страната: '+f(pn,1)+'%).</p><p>≈ '+String(Math.round(pv*emp/10)*100).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+' души от '+f(emp,1)+' хил. заети (реален брой, Q2 2026).</p><p class="low">ДЕМО: измислена стойност за илюстрация. Не е статистика.</p>';
    h+='<table class="mini"><tbody>'+NAMES.map(function(nm,i){return '<tr><th style="white-space:normal">'+nm+'</th><td class="num'+(i===S.ind?' hl':'')+'">'+f(PS[n][i],1)+'%</td></tr>'}).join('')+'</tbody></table>';
    el.innerHTML=h;return}
  if(isAz()){var rk3=rankOf(n),dm=AZ[n]===undefined;
    el.innerHTML=h+'<div class="big">'+f(AZA[n],2)+'%'+(dm?' '+TAG:'')+'</div><p>регистрирана безработица, април 2026 (АЗ), '+rk3[0]+'-о място от '+rk3[1]+'. Средно за страната: '+f(AZ_NAT,2)+'%.</p>'+(dm?'<p class="low">ДЕМО: за тази област няма намерена публикувана стойност; числото е измислено.</p>':'<p class="m">Реална стойност (Агенция по заетостта).</p>');return}
  var v=val(n),rk=rankOf(n),nv=natv(),rate=S.ind!=="emp";
  h+='<div class="big">'+fv(v)+'</div><p>'+IND[S.ind].toLowerCase()+', '+SEXN[S.sex].toLowerCase()+', '+PERN[S.per]+'. '+rk[0]+'-о място от '+rk[1]+(rate?' ('+sg(v-nv,1,' пр. п.')+' спрямо страната)':' ('+f(v/nv*100,1)+'% от заетите в страната, изчислено)')+'.</p>';
  if(S.per==="2026Q2"){var pv=gv(n,S.ind,S.sex,"2026Q1");h+='<p class="m">Спрямо Q1 2026: '+sg(v-pv,1,rate?' пр. п.':' хил.')+'</p>'}
  h+=mini(n);
  if(isR){var ob=DS.filter(function(d){return MAP.membership[d]===n}).sort(function(a,b){return gv(b,S.ind,S.sex,S.per)-gv(a,S.ind,S.sex,S.per)});
    h+='<p class="m" style="margin-top:10px">Области в района ('+IND[S.ind].toLowerCase()+', '+SEXN[S.sex].toLowerCase()+'):</p><ul class="list">'+ob.map(function(d){var x=gv(d,S.ind,S.sex,S.per);return '<li><span>'+d+'</span><span>'+f(x,1)+(rate?'%':' хил.')+'</span></li>'}).join('')+'</ul>'}
  el.innerHTML=h;
}
function drawTable(){
  var h="",hd,m=S.ind;
  if(isProf()){
    var L2=DS.slice().sort(function(a,b){return PS[b][m]-PS[a][m]}),mx2=Math.max.apply(null,L2.map(function(d){return PS[d][m]})),tc=0;
    $("tsub").innerHTML=NAMES[m]+": дял от заетите по области. ДЕМО ДАННИ.";
    hd='<tr><th class="num">№</th><th>Област</th><th>Дял от заетите (ДЕМО)</th><th class="num">≈ души (ДЕМО)</th><th class="num">Заети, хил. (реално, Q2 2026)</th></tr>';
    L2.forEach(function(n,k){var e=D[CODE[n]]["2026Q2"].emp[0],c=Math.round(PS[n][m]*e/10)*100;tc+=c;
      h+='<tr class="demorow'+(S.sel===n?' sel':'')+'"><td class="num">'+(k+1)+'</td><td><button data-d="'+n+'">'+n+'</button></td><td><div class="cell"><span class="num" style="min-width:3.4em;text-align:right">'+f(PS[n][m],1)+'%</span><span class="bar"><i style="width:'+PS[n][m]/mx2*100+'%"></i></span></div></td><td class="num">'+String(c).replace(/\B(?=(\d{3})+(?!\d))/g," ")+'</td><td class="num">'+f(e,1)+'</td></tr>'});
    h+='<tr class="nat"><td></td><td>България (претеглено, ДЕМО)</td><td><div class="cell"><span class="num" style="min-width:3.4em;text-align:right">'+f(pnat(m),1)+'%</span><span class="bar"><i style="width:'+pnat(m)/mx2*100+'%"></i></span></div></td><td class="num">'+String(tc).replace(/\B(?=(\d{3})+(?!\d))/g," ")+'</td><td class="num">'+f(D.BG["2026Q2"].emp[0],1)+'</td></tr>';
    $("tnote").textContent="ДЕМО: дяловете по професии са измислени. Само колоната с брой заети е реална (НСИ).";
  }else if(isAz()){
    $("tsub").textContent="Регистрирана безработица по области, април 2026. Средно за страната: "+f(AZ_NAT,2)+"%. 6 реални стойности (Агенция по заетостта) и 22 ДЕМО.";
    hd='<tr><th class="num">№</th><th>Област</th><th class="num">Регистрирана безработица</th><th>Вид</th></tr>';
    DS.slice().sort(function(a,b){return AZA[b]-AZA[a]}).forEach(function(n,k){var dm=AZ[n]===undefined;
      h+='<tr class="'+(dm?'demorow':'')+(S.sel===n?' sel':'')+'"><td class="num">'+(k+1)+'</td><td><button data-d="'+n+'">'+n+'</button></td><td class="num">'+f(AZA[n],2)+'%</td><td>'+(dm?'<span class="tag" style="margin:0">ДЕМО</span>':'реално (АЗ)')+'</td></tr>'});
    $("tnote").textContent="ДЕМО стойностите са измислени и показват само как би изглеждала пълна таблица.";
  }else{
    var rate=m!=="emp",L=ents().slice().sort(function(a,b){return val(b)-val(a)}),nat=natv(),mx=Math.max.apply(null,L.map(val)),u=rate?" пр. п.":" хил.";
    $("tsub").textContent=IND[m]+", "+SEXN[S.sex].toLowerCase()+", "+PERN[S.per]+", "+(lv()==="reg"?"по статистически райони":"по области")+"."+(rate?" Оранжевата черта е средното за страната ("+f(nat,1)+"%).":" Общо за страната: "+f(nat,1)+" хил.");
    hd='<tr><th class="num">№</th><th>'+(lv()==="reg"?"Район":"Област")+'</th><th>'+SEXN[S.sex]+'</th>'+SEXN.map(function(s,i){return '<th class="num">'+s+'</th>'}).join('')+'<th class="num">Q2 спрямо Q1</th></tr>';
    var cell=function(e,i){var x=gv(e,m,i,S.per);return '<td class="num'+(i===S.sex?' hl':'')+'">'+f(x,1)+(rate?'%':'')+'</td>'};
    var dl=function(e){return '<td class="num">'+sg(gv(e,m,S.sex,"2026Q2")-gv(e,m,S.sex,"2026Q1"),1,u)+'</td>'};
    L.forEach(function(n,k){var v=val(n);
      h+='<tr'+(S.sel===n?' class="sel"':'')+'><td class="num">'+(k+1)+'</td><td><button data-d="'+n+'">'+n+'</button></td><td><div class="cell"><span class="num" style="min-width:3.6em;text-align:right">'+f(v,1)+(rate?'%':'')+'</span><span class="bar"><i style="width:'+(rate?v:v/mx*100)+'%"></i>'+(rate?'<u style="left:'+nat+'%"></u>':'')+'</span></div></td>'+cell(n,0)+cell(n,1)+cell(n,2)+dl(n)+'</tr>'});
    h+='<tr class="nat"><td></td><td>България</td><td></td>'+cell("BG",0)+cell("BG",1)+cell("BG",2)+dl("BG")+'</tr>';
    $("tnote").textContent="Данни на НСИ, Наблюдение на работната сила. Колоната „Q2 спрямо Q1“ е промяна за избрания пол"+(rate?" в процентни пунктове":" в хиляди")+"; тримесечията не са сезонно изчистени от показаните данни.";
  }
  $("thead").innerHTML=hd;$("rows").innerHTML=h;
}
function render(){drawMap();drawInfo();drawTable()}
var map=$("map");
function pick(el){var p=el.closest&&el.closest("[data-d]");return p&&map.contains(p)?ent(p.getAttribute("data-d")):null}
map.addEventListener("click",function(e){var n=pick(e.target);if(n){S.sel=n;S.hov=null;render()}});
map.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){var n=pick(e.target);if(n){e.preventDefault();S.sel=n;render()}}});
map.addEventListener("mouseover",function(e){var n=pick(e.target);if(n!==S.hov){S.hov=n;drawInfo()}});
map.addEventListener("mouseleave",function(){S.hov=null;drawInfo()});
$("rows").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;S.sel=b.dataset.d;render()});
function thou(n) { var p = f(n, 1).split(","); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + p[1]; }
function drawKpis() {
  var el = $("kpis"); if (!el || !X.kpis) return;
  el.innerHTML = X.kpis.map(function (k) {
    var v = k.kind === "rate" ? f(k.value, 1) + "%" : thou(k.value) + " хил.";
    return '<div class="kpi"><b>' + v + '</b><span>' + k.label + '</span></div>';
  }).join("");
}
drawKpis();
build(); syncCtl(); render();
}

Promise.all([
  fetch("/data/map.json").then(function (r) { if (!r.ok) throw new Error("map.json"); return r.json(); }),
  fetch("/api/dataset").then(function (r) { if (!r.ok) throw new Error("api/dataset"); return r.json(); })
]).then(function (r) { boot(r[0], r[1]); })
  .catch(function (e) { fail("Данните не можаха да се заредят (" + e.message + ")."); console.error(e); });
})();
