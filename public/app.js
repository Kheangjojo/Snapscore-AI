const $=i=>document.getElementById(i),S={};let W=320,H=240;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return k in S?S[k]:d}},set(k,v){S[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const users=()=>LS.get('ss_users',{});
let me=null,cur='General',res=null,tab='login';
const U=()=>me?users()[me]:(LS.get('ss_guest',null)||{name:'Guest',plan:'free',use:{d:'',n:0},hist:[],w:[5,5,5,5,5,5],prof:'General'});
const saveU=u=>{if(!me){LS.set('ss_guest',{...u,hist:[],tot:0});return}const a=users();a[me]=u;LS.set('ss_users',a)};
const today=()=>new Date().toLocaleDateString('en-CA');
const col=n=>['#3b3bff','#f04438','#12b76a','#f79009','#7a3bff'][[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%5];

/* views */
function go(v){['home','proj','settings','about','sub'].forEach(x=>$('v-'+x).hidden=x!==v);document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.go===v));if(v==='settings')setUI();if(v==='sub')subUI();if(v==='proj')projUI();scrollTo(0,0)}
document.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(a.dataset.go));

/* account */
function acct(){
 const a=$('acct'),u=me?U():null;
 if(!u){a.innerHTML='<button class="btn" id="li">Log in</button>';$('li').onclick=()=>openAuth('login')}
 else{a.innerHTML=`<button class="me" id="mb" aria-haspopup="true"><span class="av" style="background:${col(u.name)}">${u.name[0].toUpperCase()}</span><span class="nm"></span></button><div id="menu" hidden><button id="lo">Log out</button></div>`;
  a.querySelector('.nm').textContent=u.name;
  $('mb').onclick=e=>{e.stopPropagation();$('menu').hidden=!$('menu').hidden};
  $('lo').onclick=()=>{api('POST','/api/auth/logout').catch(()=>{});me=null;res=null;acct();meter();$('res').hidden=true;$('tools').hidden=true;$('gd').hidden=true;$('pack').hidden=true;$('drop').classList.remove('has');hist();go('home')}}
}
document.addEventListener('click',()=>{const m=$('menu');if(m)m.hidden=true});
function openAuth(t){tab=t;$('mod').hidden=false;authUI()}
function authUI(){const s=tab==='signup';$('tl').classList.toggle('on',!s);$('ts').classList.toggle('on',s);$('fn').hidden=!s;$('go').textContent=s?'Create account':'Log in';$('er').textContent=''}
$('tl').onclick=()=>{tab='login';authUI()};$('ts').onclick=()=>{tab='signup';authUI()};
$('mx').onclick=()=>$('mod').hidden=true;
$('go').onclick=async()=>{
 const e=$('fe').value.trim().toLowerCase(),p=$('fp2').value,n=$('fn').value.trim(),er=$('er');
 if(!/^\S+@\S+\.\S+$/.test(e))return er.textContent='Enter a valid email.';
 if(p.length<8)return er.textContent='Password needs 8+ characters.';
 if(tab==='signup'&&!n)return er.textContent='Add your name.';
 $('go').disabled=true;
 try{const j=await api('POST',tab==='signup'?'/api/auth/register':'/api/auth/login',tab==='signup'?{email:e,name:n,password:p}:{email:e,password:p});
  setSession(j.user);$('mod').hidden=true;$('fp2').value='';acct();meter();hist();}
 catch(x){er.textContent=x.message}finally{$('go').disabled=false}
};
['fe','fp2','fn'].forEach(i=>$(i).addEventListener('keydown',e=>{if(e.key==='Enter')$('go').click()}));

/* usage */
function left(u){if(u.plan==='premium')return Infinity;return u.use.d===today()?Math.max(0,3-u.use.n):3}
function meter(){
 const u=U(),m=$('meter');
 
 const l=left(u);
 m.innerHTML=l===Infinity?'<b style="font:800 30px var(--d)">&infin;</b> unlimited snaps':[0,1,2].map(i=>`<span class="dot ${i<l?'f':''}"></span>`).join('')+`<span>${l} snap${l===1?'':'s'} left today${me?'':' (guest)'}</span>`;
}

/* photo sources */
const off=document.createElement('canvas');off.width=W;off.height=H;const oc=off.getContext('2d'),sm=document.createElement('canvas'),sc=sm.getContext('2d');
const cv=$('cv'),cx=cv.getContext('2d',{willReadFrequently:true});
const CL=[[14,28,28,28,'#d9534f'],[274,22,32,30,'#4f7fd9'],[284,150,26,52,'#5aa33a'],[8,160,30,40,'#e0a030'],[200,6,44,18,'#8a4fd9'],[52,206,36,24,'#d94f9a']];
const rr=(x,y,w,h,r)=>{oc.beginPath();oc.roundRect?oc.roundRect(x,y,w,h,r):oc.rect(x,y,w,h);oc.fill()};
function sample(Q){W=320;H=240;setSize();
 const q=Q||{l:10+Math.random()*60,f:Math.random()*4,c:Math.floor(Math.random()*6),p:(Math.random()-.5)*80};
 const g=oc.createLinearGradient(0,0,0,H);g.addColorStop(0,'#dcd7ca');g.addColorStop(1,'#cfc9ba');oc.fillStyle=g;oc.fillRect(0,0,W,H);
 CL.slice(0,q.c).forEach(c=>{oc.fillStyle=c[4];oc.fillRect(c[0],c[1],c[2],c[3])});
 const x=160+q.p*1.5;
 oc.fillStyle='rgba(0,0,0,.18)';oc.beginPath();oc.ellipse(x,200,66,10,0,0,7);oc.fill();
 oc.fillStyle='#24665f';rr(x-55,78,110,122,14);oc.fillStyle='#ead9a6';rr(x-38,108,76,48,6);
 oc.fillStyle='#24665f';oc.beginPath();oc.arc(x,132,10,0,7);oc.fill();oc.fillStyle='#c19a3b';rr(x-48,58,96,28,6);
 const k=1+q.f*.8,sw=Math.round(W/k),sh=Math.round(H/k);sm.width=sw;sm.height=sh;sc.drawImage(off,0,0,sw,sh);
 cx.imageSmoothingEnabled=true;cx.drawImage(sm,0,0,W,H);
 cx.fillStyle=q.l<50?`rgba(0,0,0,${(50-q.l)/50*.85})`:`rgba(255,255,255,${(q.l-50)/50*.5})`;cx.fillRect(0,0,W,H);
}
function fromImg(im){const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;cx.drawImage(im,(W-w)/2,(H-h)/2,w,h)}

/* analysis */
const cl=v=>Math.max(0,Math.min(100,Math.round(v)));
function analyze(){
 const d=cx.getImageData(0,0,W,H).data,N=W*H,g=new Float32Array(N),e=new Uint8Array(N);let sum=0,clip=0;
 for(let i=0;i<N;i++){const v=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];g[i]=v;sum+=v;if(v>248)clip++}
 const m=sum/N;let sq=0;for(let i=0;i<N;i++)sq+=(g[i]-m)**2;const sd=Math.sqrt(sq/N);
 let ls=0,l2=0,c=0;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,lp=4*g[i]-g[i-1]-g[i+1]-g[i-W]-g[i+W];ls+=lp;l2+=lp*lp;c++;if(Math.abs(g[i+1]-g[i-1])+Math.abs(g[i+W]-g[i-W])>40)e[i]=1}
 const lv=l2/c-(ls/c)**2;let mr=0,mg=0,mb=0,mn=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x<26||x>W-27||y<19||y>H-20){const i=(y*W+x)*4;mr+=d[i];mg+=d[i+1];mb+=d[i+2];mn++}
 mr/=mn;mg/=mn;mb/=mn;
 let a=0,sx=0,sy=0,rm=0,re=0,rn=0,cr=0,cg=0,cb=0,st=0,x0=W,y0=H,x1=0,y1=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x,i=p*4,R=d[i],G=d[i+1],B=d[i+2],ring=x<38||x>W-39||y<29||y>H-30,mk=Math.hypot(R-mr,G-mg,B-mb)>50;
  if(mk){a++;sx+=x;sy+=y;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);cr+=R;cg+=G;cb+=B;const mx=Math.max(R,G,B);st+=mx?(mx-Math.min(R,G,B))/mx:0}
  if(ring){rn++;if(mk)rm++;if(e[p])re++}}
 const area=a/N,dc=a?Math.hypot(cr/a-mr,cg/a-mg,cb/a-mb):0,areaS=100-Math.max(0,.2-area)*450-Math.max(0,area-.6)*300;
 const t=document.createElement('canvas');t.width=40;t.height=30;const tc=t.getContext('2d');tc.drawImage(cv,0,0,40,30);
 const td=tc.getImageData(0,0,40,30).data;let ts=0,tq=0;for(let i=0;i<1200;i++){const v=.299*td[i*4]+.587*td[i*4+1]+.114*td[i*4+2];ts+=v;tq+=v*v}
 const tsd=Math.sqrt(Math.max(0,tq/1200-(ts/1200)**2));
 const dev=a?Math.hypot(sx/a/W-.5,(sy/a/H-.5)*.8):.5;
 const s=[
  cl(100-Math.max(0,120-m)*1.3-Math.max(0,m-220)*1.6-clip/N*250-Math.max(0,30-sd)*1.2),
  cl(Math.sqrt(Math.max(0,lv))*5),
  cl(a<N*.01?20:.6*(100-dev*350)+.4*areaS),
  cl(100-rm/rn*300-re/rn*220),
  cl((a?st/a:0)*85+Math.min(100,dc*.9)*.4),
  cl(Math.min(100,tsd*2.2)*.6+areaS*.4)];
 return{s,m,bg:[mr,mg,mb],q:{m,sd,lv,clip:clip/N,area,dc,tsd,sat:a?st/a:0,rm:rm/rn,dx:a?sx/a/W-.5:0,dy:a?sy/a/H-.5:0,px:a?sx/a:W/2,py:a?sy/a:H/2,bb:a?[x0,y0,x1,y1]:[0,0,0,0]}};
}

/* scoring */
const M=['Light','Focus','Framing','Backdrop','Pop','Feed'];
const P={General:[.2,.2,.15,.15,.15,.15],Food:[.25,.15,.1,.1,.25,.15],Fashion:[.15,.2,.2,.2,.1,.15],Beauty:[.2,.3,.1,.15,.1,.15],Handmade:[.2,.15,.15,.25,.1,.15]};
const T=[[90,'S','Studio ready','#12b76a'],[78,'A','Scroll-stopper','#3b3bff'],[62,'B','Almost there','#f79009'],[45,'C','Needs a reshoot','#f76b15'],[0,'D','Retake it','#f04438']];
const bc=v=>v>=80?'#12b76a':v>=60?'#3b3bff':v>=40?'#f79009':'#f04438';
function wts(){if(cur==='Custom'&&U()){const w=U().w,t=w.reduce((a,b)=>a+b,0)||1;return w.map(x=>x/t)}return P[cur]||P.General}
const tip=(i,m)=>[m<120?'Add soft window light':m>220?'Soften the light':'Even out the light','Steady the camera, tap to focus','Center the product','Clear the background','Use a contrasting backdrop','Move closer, fill the frame'][i];
function score(){const w=wts();return cl(res.s.reduce((t,v,i)=>t+v*w[i],0))}
function show(prevScore){
 const w=wts(),o=score(),tr=T.find(x=>o>=x[0]);
 $('res').hidden=false;$('ov').textContent=o;
 const rg=$('rg');rg.style.stroke=tr[3];rg.setAttribute('stroke-dasharray',`${o/100*327} 327`);
 $('gr').textContent=`${tr[1]} · ${tr[2]}`;$('gr').style.color=tr[3];
 const dl=$('dl');if(prevScore!=null){const d=o-prevScore;dl.textContent=d===0?'Same as last snap':`${d>0?'+':''}${d} vs last snap`;dl.style.color=d>=0?'#12b76a':'#f04438'}
 $('chips').innerHTML=[...Object.keys(P),'Custom'].map(k=>`<button class="${k===cur?'on':''}">${k}</button>`).join('');
 $('chips').querySelectorAll('button').forEach(b=>b.onclick=()=>{cur=b.textContent;show(null);shots(U());const x=$('dl');x.textContent=''});
 $('mt').innerHTML=res.s.map((v,i)=>`<div class="m"><b>${M[i]}<span>${v}</span></b><small>${Math.round(w[i]*100)}% of score</small><div class="trk"><i style="width:${v}%;background:${bc(v)}"></i></div></div>`).join('');
 const wins=res.s.map((v,i)=>[Math.round(w[i]*(100-v)),i]).filter(x=>x[0]>=2).sort((a,b)=>b[0]-a[0]).slice(0,3);
 $('wins').innerHTML=wins.length?wins.map(x=>`<div class="win"><b>+${x[0]}</b>${tip(x[1],res.m)}</div>`).join(''):'<div class="win"><b>✓</b>Ready to post</div>';
 $('fp').getContext('2d').drawImage(cv,0,0,72,54);afText();fixGuide();
}
function hist(){
 const u=U(),h=$('hist');stats(u);chal(u);shots(u);if(!u||!u.hist.length){h.innerHTML='';return}
 h.innerHTML=u.hist.map(x=>`<div><img src="${x.img}" alt="">${x.sc}</div>`).join('');
 const p=u.hist.map(x=>x.sc).reverse();
 if(p.length>1)h.innerHTML+=`<div><svg viewBox="0 0 300 64" width="150" height="48" aria-label="Score trend"><polyline points="${p.map((v,i)=>(i*300/(p.length-1))+','+(62-v*.58)).join(' ')}" fill="none" stroke="#3b3bff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>trend</div>`;
}

/* snap */
function snap(draw){
 const u=U();if(!u)return openAuth('login');
 if(left(u)<=0){$('lim').hidden=false;return}
 draw();$('drop').classList.add('has');
 res=analyze();
 if(u.use.d!==today())u.use={d:today(),n:0};u.use.n++;
 const prev=u.hist.length?u.hist[0].sc:null;
 show(prev);extras();
 const t=document.createElement('canvas');t.width=64;t.height=48;t.getContext('2d').drawImage(cv,0,0,64,48);
 const sc0=score(),yd=new Date(Date.now()-864e5).toLocaleDateString('en-CA');
 u.tot=(u.tot||0)+1;u.best=Math.max(u.best||0,sc0);if(u.day!==today()){u.streak=u.day===yd?(u.streak||0)+1:1;u.day=today()}
 u.gain=Math.max(u.gain||0,prev==null?0:sc0-prev);chalCheck(u,sc0);
 u.hist.unshift({sc:sc0,img:t.toDataURL('image/jpeg',.5)});u.hist=u.hist.slice(0,8);
 saveU(u);meter();hist();
}
$('pick').onclick=()=>$('file').click();
$('drop').onclick=()=>$('file').click();
$('drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click()}};
$('smp').onclick=()=>snap(()=>{info=null;srcImg=null;sample()});
function load(f){if(!f)return;if(!U())return openAuth('login');const im=new Image();im.onload=()=>snap(()=>{info={w:im.width,h:im.height,kb:f.size/1024};srcImg=im;fromImg(im)});im.src=URL.createObjectURL(f)}
$('file').onchange=e=>{load(e.target.files[0]);e.target.value=''};
['dragover','dragenter'].forEach(n=>$('drop').addEventListener(n,e=>{e.preventDefault();$('drop').classList.add('hv')}));
['dragleave','drop'].forEach(n=>$('drop').addEventListener(n,e=>{e.preventDefault();$('drop').classList.remove('hv')}));
$('drop').addEventListener('drop',e=>load(e.dataTransfer.files[0]));
$('lx').onclick=()=>$('lim').hidden=true;$('lp').onclick=()=>{$('lim').hidden=true;go('sub')};

/* settings */
function setUI(){
 const u=me?U():null,b=$('setbox');
 if(!u){b.innerHTML='<p class="lead">Log in to change your settings.</p><button class="btn" id="sl">Log in</button>';$('sl').onclick=()=>openAuth('login');return}
 b.innerHTML=`<div class="set"><div><b>Name</b><input class="fld" id="sn" maxlength="30"></div>
 <div><b>Default look</b><select class="fld" id="sp">${[...Object.keys(P),'Custom'].map(k=>`<option>${k}</option>`).join('')}</select></div>
 <div><b>Custom mix</b><p style="color:var(--mut);margin:2px 0 8px">Decide what matters most to you.</p>${M.map((m,i)=>`<label>${m}<input type="range" min="0" max="10" value="${u.w[i]}" data-i="${i}"><span>${u.w[i]}</span></label>`).join('')}</div>
 <div><button class="btn alt" id="ch">Clear my snap history</button></div></div>`;
 $('sn').value=u.name;$('sp').value=u.prof||'General';
 $('sn').onchange=()=>{const v=$('sn').value.trim();if(v){const x=U();x.name=v;saveU(x);acct()}};
 $('sp').onchange=()=>{const x=U();x.prof=cur=$('sp').value;saveU(x)};
 b.querySelectorAll('input[type=range]').forEach(r=>r.oninput=()=>{const x=U();x.w[+r.dataset.i]=+r.value;saveU(x);r.nextElementSibling.textContent=r.value});
 $('ch').onclick=()=>{const x=U();x.hist=[];saveU(x);hist()};
}

/* subscription */
function subUI(){
 const u=me?U():null,pro=u&&u.plan==='premium';
 $('bf').textContent=!u?'Log in to start':pro?'Switch to Free':'Your plan';$('bf').disabled=!!u&&!pro;
 $('bp').textContent=pro?'Your plan':'Go Premium';$('bp').disabled=!!pro;
 $('bf').onclick=()=>{if(!u)return openAuth('login');const x=U();x.plan='free';saveU(x);subUI();meter()};
 $('bp').onclick=()=>{if(!u)return openAuth('signup');const x=U();x.plan='premium';saveU(x);subUI();meter()};
}

/* extras: auto-fix, post-ready checks, stats */
let info=null,srcImg=null,fx=null,lut=null;
function enhance(){
 const id=cx.getImageData(0,0,W,H),d=id.data,N=W*H,h=new Uint32Array(256);
 for(let i=0;i<N;i++)h[Math.round(.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2])]++;
 let lo=0,hi=255,a=0;while(lo<255&&(a+=h[lo])<N*.01)lo++;a=0;while(hi>0&&(a+=h[hi])<N*.01)hi--;
 if(hi-lo<40){lo=Math.max(0,lo-20);hi=Math.min(255,hi+20)}
 const st=v=>Math.max(0,Math.min(1,(v-lo)/(hi-lo||1)));
 let ms=0;for(let k=0;k<256;k++)ms+=h[k]*st(k);ms=Math.max(.05,Math.min(.95,ms/N));
 const gm=Math.max(.45,Math.min(1.15,Math.log(.6)/Math.log(ms)));
 lut=new Uint8ClampedArray(256);for(let k=0;k<256;k++)lut[k]=Math.round(255*Math.pow(st(k),gm));
 for(let i=0;i<N;i++){d[i*4]=lut[d[i*4]];d[i*4+1]=lut[d[i*4+1]];d[i*4+2]=lut[d[i*4+2]]}
 return id;
}
function extras(){
 $('bc').getContext('2d').drawImage(cv,0,0);
 const id=enhance();$('ac').getContext('2d').putImageData(id,0,0);
 cx.putImageData(id,0,0);fx=analyze();cx.drawImage($('bc'),0,0);
 $('tools').hidden=false;slide(50);afText();checks(res.bg);guides();
}
function afText(){if(!fx||!res)return;const w=wts(),o=score(),n=cl(fx.s.reduce((t,v,i)=>t+v*w[i],0));$('af').textContent=n>o?`Auto-fix: ${o} → ${n} (+${n-o} pts)`:'Light is already well balanced.'}
function slide(p){$('bc').style.clipPath=`inset(0 ${100-p}% 0 0)`;$('bl').style.left=p+'%'}
const ba=$('ba'),mv=e=>{const r=ba.getBoundingClientRect();slide(Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)))};
ba.onpointerdown=e=>{ba.setPointerCapture(e.pointerId);mv(e);ba.onpointermove=mv};
ba.onpointerup=()=>{ba.onpointermove=null};
$('dlb').onclick=()=>{
 let c=$('ac');
 if(srcImg){const s=Math.min(1,2048/Math.max(srcImg.width,srcImg.height));c=document.createElement('canvas');c.width=Math.round(srcImg.width*s);c.height=Math.round(srcImg.height*s);const g=c.getContext('2d');g.drawImage(srcImg,0,0,c.width,c.height);const id=g.getImageData(0,0,c.width,c.height),d=id.data;for(let i=0;i<d.length;i+=4){d[i]=lut[d[i]];d[i+1]=lut[d[i+1]];d[i+2]=lut[d[i+2]]}g.putImageData(id,0,0)}
 const a=document.createElement('a');a.href=c.toDataURL('image/jpeg',.92);a.download='snapscore-fixed.jpg';a.click();
};
function checks(b){
 const L=[];
 if(info){const mx=Math.max(info.w,info.h),r=info.w/info.h;
  L.push([mx>=1080,`Sharp for Instagram (${info.w}×${info.h})`]);
  L.push([mx>=1000,'Amazon zoom size (1000px+)']);
  L.push([Math.abs(r-1)<.04||Math.abs(r-.8)<.04,'Feed shape (square or 4:5)']);
  L.push([info.kb<5120,'Loads fast ('+(info.kb<1024?Math.round(info.kb)+' KB':(info.kb/1024).toFixed(1)+' MB')+')'])}
 L.push([Math.min(...b)>=235,'White backdrop (Amazon main photo)']);
 $('chk').innerHTML=L.map(x=>`<div><b style="background:${x[0]?'#12b76a':'#f04438'}">${x[0]?'✓':'✕'}</b>${x[1]}</div>`).join('')+(info?'':'<p style="color:var(--mut);font-size:14px">Upload a real photo to check size and shape.</p>');
}
function stats(u){
 const s=$('stats'),b=$('bd');
 if(!u||!u.tot){s.innerHTML=b.innerHTML='';return}
 s.innerHTML=[[u.tot,'snaps'],[u.best,'best score'],[(u.streak||1)+' 🔥','day streak']].map(x=>`<div class="stat"><b>${x[0]}</b>${x[1]}</div>`).join('');
 const B=[[u.tot>=1,'First snap'],[u.best>=78,'Grade A'],[u.best>=90,'Studio S'],[(u.streak||0)>=3,'3-day streak'],[(u.gain||0)>=15,'Comeback +15'],[(u.cd||0)>=3,'3 challenges']];
 b.innerHTML=B.map(x=>`<span class="${x[0]?'on':''}">${x[0]?'★ ':'🔒 '}${x[1]}</span>`).join('');
}
/* fix guide, overlay, share card */
const GD=[
q=>{const dk=q.m<120,br=q.m>220||q.clip>.06;return[`Average brightness is ${Math.round(q.m)}/255 (aim for 130 to 210).`+(q.clip>.03?` ${Math.round(q.clip*100)}% of the photo is pure white.`:''),
 dk?'Dark photos hide texture and color, so the product looks cheap and shoppers scroll past.':br?'Blown-out highlights lose detail and make colors look washed out.':'Flat light removes shadows, so the product looks like a flat cutout.',
 dk?['Move the product next to a window in the daytime.','Place it so the light hits from the side, not from behind.','Turn off yellow room lights, because mixed light tints the colors.','No window? Use two lamps at 45° left and right, with white paper in front to soften them.']:br?['Move out of direct sunlight, or hang a thin white cloth over the window.','Tap the product and drag the sun icon down to lower exposure.','Turn the flash off.','Check that the brightest area still shows detail.']:['Add one main light from the side at 45°.','Put a white card on the opposite side to fill the shadows.','Keep the light soft: a window beats a bare bulb.'],
 {General:'Window light on a cloudy day is the easiest free studio.',Food:'Shoot food by a window and skip the flash, which makes food look oily.',Fashion:'Shoot fabric in open shade so colors stay true.',Beauty:'Avoid light from directly above; it makes glossy packaging glare.',Handmade:'Light from the side to show off texture and craftsmanship.'}]},
q=>[`Edge crispness is ${Math.round(Math.sqrt(q.lv)*5)}/100 (aim for 70+).`,'Soft photos look unprofessional and hide the details buyers want to inspect.',['Rest both elbows on a table, or lean the phone on a stack of books.','Tap the product on the screen so the camera locks focus on it.','Wipe the lens with a clean cloth.','Use the 2-second timer so pressing the button does not shake the camera.','Stay 20 to 30 cm from small items, because phones cannot focus closer.'],{General:'Dim light slows the camera down, so brighter light also gives sharper photos.',Food:'Focus on the front edge of the dish, the part nearest the viewer.',Beauty:'Focus on the label text. If you can read it, the photo is sharp enough.'}],
q=>{const px=Math.round(Math.abs(q.dx)*100),py=Math.round(Math.abs(q.dy)*100),st=[];
 if(px>6||py>6)st.push(`Move the product ${px>6?(q.dx>0?'left':'right'):''}${px>6&&py>6?' and ':''}${py>6?(q.dy>0?'up':'down'):''}, or shift the camera the other way, until it sits in the middle.`);
 if(q.area<.15)st.push('Step closer or zoom in so the product fills about a third of the frame.');
 if(q.area>.6)st.push('Step back and leave at least 10% empty margin on every side.');
 st.push('Turn on your camera grid and line the product up with the center cross.','Hold the camera level with the product, not tilted.');
 return[`The product sits ${px}% ${q.dx>0?'right':'left'} and ${py}% ${q.dy>0?'below':'above'} the center, and fills ${Math.round(q.area*100)}% of the frame.`,'A centered product with even margins looks deliberate and survives square cropping on Instagram and marketplaces.',st,{General:'Leave breathing room so the photo can be cropped to square or 4:5 later.',Fashion:'Show the full item with space around it; cut-off sleeves or hems look careless.',Food:'Shoot from above at 90° for flat dishes, or at 45° for tall ones.'}]},
q=>[`${Math.round(q.rm*100)}% of the frame edges contain other objects or colors.`,'Clutter competes with the product for attention and makes the shop look amateur.',['Remove everything from the frame except the product.','Use a plain sheet, poster board or clean wall behind it.','Smooth out wrinkles with a quick iron or by taping the sheet flat.','Keep the product 30 cm or more in front of the backdrop so shadows soften.','Check all four corners of your screen before you press the button.'],{General:'White or light grey paper is the safest backdrop for any product.',Food:'A wooden board or plain plate works better than a busy tablecloth.',Fashion:'Hang clothes on a plain wall, or lay them flat on a clean floor.',Beauty:'A single-color surface lets glossy packaging stand out.',Handmade:'A neutral linen or wood surface suits handmade goods.'}],
q=>[`Color punch is ${Math.round(q.sat*100)}% and contrast against the backdrop is ${Math.round(Math.min(100,q.dc*.9))}/100.`,'Products that blend into the backdrop vanish in a busy feed.',['Pick a backdrop with the opposite tone: dark for light products, light for dark ones.','For muted products, use a colored backdrop from the opposite side of the color wheel.','Add one small prop in a matching accent color.','Avoid backdrops close to the product color.'],{General:'Raise contrast a little in your phone editor, but stop before colors look fake.'}],
q=>[`At thumbnail size the product has ${Math.round(Math.min(100,q.tsd*2.2))}/100 detail contrast.`,'Most shoppers first see your photo as a tiny square in a feed or search result.',['Fill more of the frame with the product.','Choose a bold shape with strong light and dark areas.','Shrink the photo to the size of a postage stamp. If the product is unclear, retake it.','Remove small props that turn into noise at small size.'],{General:'The Feed preview next to your score shows how this photo looks at thumbnail size.'}]];
function fixGuide(){
 if(!res||!res.q)return;const w=wts(),g=$('gd');
 const L=res.s.map((v,i)=>[Math.round(w[i]*(100-v)),i,v]).filter(x=>x[2]<85).sort((a,b)=>b[0]-a[0]);
 g.hidden=false;
 if(!L.length){g.innerHTML='<h2 style="font-size:28px">Fix guide</h2><p>Nothing to fix. This photo is ready to post.</p>';return}
 g.innerHTML='<h2 style="font-size:28px">Fix guide <small>biggest gains first</small></h2>'+L.map((x,k)=>{const r=GD[x[1]](res.q),pt=r[3][cur]||r[3].General;
  return `<details ${k<1?'open':''}><summary><b>${M[x[1]]} ${x[2]}/100</b><span class="gp">+${x[0]} pts</span></summary><div class="gb"><p class="ms">${r[0]}</p><p class="sub2"><b>${EXP[x[1]]}</b></p><p><b>Why it matters.</b> ${r[1]}</p><ol>${r[2].map(s=>`<li><label><input type="checkbox"> ${s}</label></li>`).join('')}</ol><p class="pt"><b>${r[3][cur]?cur:'Pro'} tip.</b> ${pt}</p></div></details>`}).join('');
}
let gOn=false;
function guides(){
 const c=$('gv'),g=c.getContext('2d');g.clearRect(0,0,W,H);if(!gOn||!res)return;const q=res.q;
 g.lineWidth=1.5;g.strokeStyle='rgba(255,255,255,.9)';g.beginPath();[1,2].forEach(k=>{g.moveTo(W*k/3,0);g.lineTo(W*k/3,H);g.moveTo(0,H*k/3);g.lineTo(W,H*k/3)});g.stroke();
 g.strokeStyle='#ffe14a';g.lineWidth=3;g.setLineDash([6,4]);g.strokeRect(q.bb[0],q.bb[1],q.bb[2]-q.bb[0],q.bb[3]-q.bb[1]);g.setLineDash([]);
 g.strokeStyle='#3b3bff';g.fillStyle='#3b3bff';g.lineWidth=3;g.beginPath();g.moveTo(q.px,q.py);g.lineTo(W/2,H/2);g.moveTo(W/2-12,H/2);g.lineTo(W/2+12,H/2);g.moveTo(W/2,H/2-12);g.lineTo(W/2,H/2+12);g.stroke();
 g.beginPath();g.arc(q.px,q.py,6,0,7);g.fill();
}
$('gbtn').onclick=()=>{gOn=!gOn;$('gbtn').textContent=gOn?'Hide guides':'Show guides';guides()};
$('scb').onclick=()=>{
 const c=document.createElement('canvas');c.width=1080;c.height=1350;const g=c.getContext('2d'),o=score(),tr=T.find(x=>o>=x[0]);
 g.fillStyle='#fff';g.fillRect(0,0,1080,1350);g.fillStyle='#11151c';g.font='800 56px sans-serif';g.fillText('SnapScore AI',60,100);
 g.drawImage(cv,60,140,960,720);g.strokeStyle='#11151c';g.lineWidth=6;g.strokeRect(60,140,960,720);
 g.fillStyle=tr[3];g.font='800 150px sans-serif';g.fillText(o,60,1030);
 g.fillStyle='#11151c';g.font='800 54px sans-serif';g.fillText(tr[1]+' · '+tr[2],340,985);g.font='500 34px sans-serif';g.fillStyle='#667085';g.fillText(cur+' profile',340,1035);
 res.s.forEach((v,i)=>{const x=60+(i%3)*330,y=1120+Math.floor(i/3)*110;g.fillStyle='#11151c';g.font='600 30px sans-serif';g.fillText(M[i]+' '+v,x,y);g.fillStyle='#e4e7ec';g.fillRect(x,y+16,300,14);g.fillStyle=bc(v);g.fillRect(x,y+16,3*v,14)});
 const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='snapscore-card.png';a.click();
};
/* challenge, duel, shot list */
const CH=[['Light it right','get Light to 85+',s=>s[0]>=85],['Clean sweep','get Backdrop to 85+',s=>s[3]>=85],['Pin sharp','get Focus to 80+',s=>s[1]>=80],['Dead center','get Framing to 85+',s=>s[2]>=85],['Color pop','get Pop to 70+',s=>s[4]>=70],['Thumb-stopper','get Feed to 75+',s=>s[5]>=75],['All-rounder','get an overall 80+',(s,o)=>o>=80]];
function chalCheck(u,o){const c=CH[new Date().getDate()%7];if(c[2](res.s,o)&&u.cdone!==today()){u.cdone=today();u.cd=(u.cd||0)+1}}
function chal(u){const c=CH[new Date().getDate()%7],ok=u&&u.cdone===today();$('chal').innerHTML=`<div class="ch ${ok?'ok':''}">Daily challenge: ${c[0]}, ${c[1]} ${ok?'✓ Done':''}</div>`}
const duel=[];
[['s1','f1'],['s2','f2']].forEach(([s,f],k)=>{$(s).onclick=()=>$(f).click();$(f).onchange=e=>{const fl=e.target.files[0];if(!fl)return;const im=new Image();im.onload=()=>{if(duel[k])URL.revokeObjectURL(duel[k].src);duel[k]=im;$(s).style.backgroundImage=`url(${im.src})`;$(s).textContent=''};im.src=URL.createObjectURL(fl);e.target.value=''}});
function scoreImg(im){const t=document.createElement('canvas');t.width=W;t.height=H;t.getContext('2d').drawImage(cv,0,0);fromImg(im);const r=analyze();cx.drawImage(t,0,0);return r}
$('dgo').onclick=()=>{
 const u=U();if(!u)return openAuth('login');
 if(!duel[0]||!duel[1]){$('dres').textContent='Pick both photos first.';return}
 if(left(u)<=0){$('lim').hidden=false;return}
 const a=scoreImg(duel[0]),b=scoreImg(duel[1]),w=wts(),f=r=>cl(r.s.reduce((t,v,i)=>t+v*w[i],0)),sc=[f(a),f(b)];
 if(u.use.d!==today())u.use={d:today(),n:0};u.use.n++;saveU(u);meter();
 const win=sc[0]===sc[1]?-1:sc[0]>sc[1]?0:1;
 let h=`<div class="duo">${[0,1].map(k=>`<div class="dc ${win===k?'win':''}">${win===k?'<span class="crown">WINNER</span>':''}<b>${'AB'[k]}</b><div class="dn">${sc[k]}</div></div>`).join('')}</div>`;
 const df=M.map((m,i)=>[i,a.s[i]-b.s[i]]).filter(x=>Math.abs(x[1])>=5).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).slice(0,3);
 h+=win<0?'<p>A tie. Pick the one you like more.</p>':'<p><b>Biggest differences</b></p><ul>'+df.map(x=>`<li>${M[x[0]]}: ${x[1]>0?'A':'B'} is ${Math.abs(x[1])} points higher</li>`).join('')+'</ul>';
 $('dres').innerHTML=h;
};
const SL={General:['Hero shot: product alone, centered','Angle shot at 45°','Detail close-up of texture or label','Scale shot with a hand or common object','Packaging or box shot'],Food:['Hero: whole dish from above','Side view that shows height','Close-up of the texture','Ingredients or toppings','Box or packaging shot'],Fashion:['Front, laid flat','Back view','Fabric close-up','Worn or on a hanger','Size tag or label'],Beauty:['Hero: product with the cap on','Open product with a texture swatch','Label and ingredients close-up','Held in a hand for scale','Set shot with the box'],Handmade:['Hero on a plain backdrop','Close-up of the craftsmanship','In-use or lifestyle shot','Scale shot with a hand','Packaging shot']};
function shots(u){
 const k=SL[cur]?cur:'General',L=SL[k],d=(u&&u.sl&&u.sl[k])||[];
 $('shots').innerHTML=L.map((t,i)=>`<label><input type="checkbox" data-i="${i}" ${d.includes(i)?'checked':''}> ${t}</label>`).join('');
 $('slp').textContent=`${d.length} of ${L.length} shots done for ${k}. Good listings use several photos.`;
 $('shots').querySelectorAll('input').forEach(c=>c.onchange=()=>{const x=U();if(!x){c.checked=false;return openAuth('login')}x.sl=x.sl||{};const s=new Set(x.sl[k]||[]);c.checked?s.add(+c.dataset.i):s.delete(+c.dataset.i);x.sl[k]=[...s];saveU(x);shots(x)});
}
/* v3: guest mode, aspect ratio, fix studio, listing targets, store lab, photo director */
let base=null,stP={b:0,c:0,w:0,s:0,crop:'orig',z:100,auto:true},tgk='social',lab=[];
const msg=t=>{$('msg').textContent=t};
const EXP=['Measured: average brightness, clipped highlights and contrast. Objective.','Measured: how sharp the edges are. Objective, but textured products score differently.','Measured: product size and position, found by color difference from the frame edge. A rule-of-thumb target.','Measured: how much of the frame edge differs from the backdrop color. Whether it looks messy is a judgment.','Measured: color saturation and contrast with the backdrop. Style preferences vary.','Measured: contrast and product size at 40x30 pixels, a stand-in for a feed thumbnail.'];
function setSize(){[cv,$('gv'),off].forEach(c=>{c.width=W;c.height=H})}
function fromImg(im){const k=320/Math.max(im.width,im.height);W=Math.max(8,Math.round(im.width*k));H=Math.max(8,Math.round(im.height*k));setSize();cx.drawImage(im,0,0,W,H)}
function analyzeCanvas(c){const w0=W,h0=H,t=document.createElement('canvas');t.width=w0;t.height=h0;t.getContext('2d').drawImage(cv,0,0);W=c.width;H=c.height;setSize();cx.drawImage(c,0,0);const r=analyze();W=w0;H=h0;setSize();cx.drawImage(t,0,0);return r}
function scoreImg(im){const w0=W,h0=H,t=document.createElement('canvas');t.width=w0;t.height=h0;t.getContext('2d').drawImage(cv,0,0);fromImg(im);const r=analyze();W=w0;H=h0;setSize();cx.drawImage(t,0,0);return r}
const SM={dark:{l:12,f:.4,c:0,p:0},mess:{l:55,f:.4,c:6,p:12},good:{l:55,f:0,c:0,p:0}};
document.querySelectorAll('.gal button').forEach(b=>b.onclick=()=>snap(()=>{info=null;srcImg=null;sample(SM[b.dataset.s])},true));
$('smp').onclick=()=>snap(()=>{info=null;srcImg=null;sample()},true);
function load(f){
 msg('');if(!f)return;
 if(!/^image\/(jpeg|png|webp|gif)$/.test(f.type))return msg('Please choose a JPG, PNG, WebP or GIF image.');
 if(f.size>15*1048576)return msg('That file is over 15 MB. Please pick a smaller photo.');
 const im=new Image();im.onload=()=>snap(()=>{info={w:im.width,h:im.height,kb:f.size/1024};srcImg=im;fromImg(im)});
 im.onerror=()=>msg('That image could not be opened. Try another file.');im.src=URL.createObjectURL(f);
}
function snap(draw,free,keep){if(!keep){origBlob=null;curPh=null;origName='';gemRes=null;$('gem').hidden=true}
 const u=U();
 if(!free&&left(u)<=0){$('lim').hidden=false;return}
 try{draw();$('drop').classList.add('has');res=analyze()}catch(e){msg('Could not analyze this image.');return}
 if(!free){if(u.use.d!==today())u.use={d:today(),n:0};u.use.n++}
 const prev=u.hist.length?u.hist[0].sc:null;
 show(prev);extras();
 if(!free){
  const t=document.createElement('canvas');t.width=64;t.height=48;t.getContext('2d').drawImage(cv,0,0,64,48);
  const sc0=score(),yd=new Date(Date.now()-864e5).toLocaleDateString('en-CA');
  u.tot=(u.tot||0)+1;u.best=Math.max(u.best||0,sc0);if(u.day!==today()){u.streak=u.day===yd?(u.streak||0)+1:1;u.day=today()}
  u.gain=Math.max(u.gain||0,prev==null?0:sc0-prev);chalCheck(u,sc0);
  u.hist.unshift({sc:sc0,img:t.toDataURL('image/jpeg',.5)});u.hist=u.hist.slice(0,8);saveU(u);
 }
 meter();hist();
}
/* fix studio */
function fixPx(g,w,h,p){const id=g.getImageData(0,0,w,h),d=id.data,c=(100+p.c)/100,b=p.b*2.55,s=(100+p.s)/100,wm=p.w*1.2;
 for(let i=0;i<d.length;i+=4){let r=d[i],gr=d[i+1],bl=d[i+2];
  if(p.auto&&lut){r=lut[r];gr=lut[gr];bl=lut[bl]}
  r+=b+wm;gr+=b;bl+=b-wm;r=(r-128)*c+128;gr=(gr-128)*c+128;bl=(bl-128)*c+128;
  const l=.299*r+.587*gr+.114*bl;d[i]=l+(r-l)*s;d[i+1]=l+(gr-l)*s;d[i+2]=l+(bl-l)*s}
 g.putImageData(id,0,0)}
function cropR(w,h,p){const ar={orig:w/h,sq:1,p45:.8}[p.crop],z=p.z/100;let cw=w,ch=h;if(ar<w/h-.001)cw=h*ar;else if(ar>w/h+.001)ch=w/ar;cw=Math.round(cw/z);ch=Math.round(ch/z);return[Math.round((w-cw)/2),Math.round((h-ch)/2),cw,ch]}
function studio(){
 const [sx,sy,cw,ch]=cropR(W,H,stP);
 [$('bc'),$('ac')].forEach(c=>{c.width=cw;c.height=ch;c.getContext('2d').drawImage(base,sx,sy,cw,ch,0,0,cw,ch)});
 fixPx($('ac').getContext('2d'),cw,ch,stP);
 fx=analyzeCanvas($('ac'));afText();checks();
}
function afText(){if(!fx||!res)return;const w=wts(),o=score(),n=cl(fx.s.reduce((t,v,i)=>t+v*w[i],0));$('af').textContent=n===o?'Edited score matches the original. Try the sliders.':`Edited: ${o} → ${n} (${n>o?'+':''}${n-o} pts)`}
function extras(){
 base=document.createElement('canvas');base.width=W;base.height=H;base.getContext('2d').drawImage(cv,0,0);
 enhance();stP={b:0,c:0,w:0,s:0,crop:'orig',z:100,auto:false};
 ['xb','xc','xw','xs'].forEach(i=>$(i).value=0);$('xz').value=100;$('xr').value='orig';$('xa').checked=false;
 $('pack').hidden=false;$('fres').hidden=true;$('tools').hidden=false;studio();slide(50);guides();
}
[['xb','b'],['xc','c'],['xw','w'],['xs','s'],['xz','z']].forEach(([i,k])=>$(i).oninput=()=>{stP[k]=+$(i).value;if(base)studio()});
$('xr').onchange=()=>{stP.crop=$('xr').value;if(base)studio()};
$('xa').onchange=()=>{stP.auto=$('xa').checked;if(base)studio()};
$('xx').onclick=()=>{if(!base)return;stP={b:0,c:0,w:0,s:0,crop:'orig',z:100,auto:false};['xb','xc','xw','xs'].forEach(i=>$(i).value=0);$('xz').value=100;$('xr').value='orig';$('xa').checked=false;$('fres').hidden=true;studio()};
$('dlb').onclick=()=>{
 if(!base)return;let c=$('ac');
 if(srcImg){const k=srcImg.width/W,[sx,sy,cw,ch]=cropR(W,H,stP),s=Math.min(1,2048/Math.max(cw*k,ch*k));c=document.createElement('canvas');c.width=Math.round(cw*k*s);c.height=Math.round(ch*k*s);const g=c.getContext('2d');g.drawImage(srcImg,sx*k,sy*k,cw*k,ch*k,0,0,c.width,c.height);fixPx(g,c.width,c.height,stP)}
 const a=document.createElement('a');a.href=c.toDataURL('image/jpeg',.92);a.download='snapscore-edited.jpg';a.click();
};
/* listing targets (editable starting points, not official rules) */
const TG={social:{n:'Social shop',min:1080,mb:8,ar:'1',wh:false,box:1},mkt:{n:'Marketplace',min:1000,mb:10,ar:'any',wh:true,box:1},web:{n:'Business website',min:1200,mb:2,ar:'any',wh:false,box:1.78}};
function syncTg(){const t=TG[tgk];$('tg').innerHTML=Object.keys(TG).map(k=>`<button class='${k===tgk?'on':''}' data-k='${k}'>${TG[k].n}</button>`).join('');
 $('tg').querySelectorAll('button').forEach(b=>b.onclick=()=>{tgk=b.dataset.k;syncTg();if(base)checks()});
 $('tmin').value=t.min;$('tmb').value=t.mb;$('tar').value=t.ar;$('twh').checked=t.wh}
[['tmin','min',1],['tmb','mb',1],['tar','ar',0],['twh','wh',2]].forEach(([i,k,m])=>$(i).onchange=()=>{TG[tgk][k]=m===2?$(i).checked:m===1?+$(i).value:$(i).value;if(base)checks()});
function checks(){
 if(!base||!fx)return;const t=TG[tgk],L=[];
 if(info){const k=info.w/W,cr=cropR(W,H,stP),ew=cr[2]*k,eh=cr[3]*k,mx=Math.max(ew,eh),r=ew/eh;
  L.push([mx>=t.min,`Longest side ${Math.round(mx)}px (needs ${t.min}+)`]);
  if(t.ar!=='any')L.push([Math.abs(r-+t.ar)<.04,`Shape ${r.toFixed(2)} (needs ${(+t.ar).toFixed(2)})`]);
  L.push([info.kb<=t.mb*1024,`Original file ${info.kb<1024?Math.round(info.kb)+' KB':(info.kb/1024).toFixed(1)+' MB'} (limit ${t.mb} MB)`])}
 if(t.wh)L.push([Math.min(...fx.bg)>=235,'Backdrop looks white']);
 $('chk').innerHTML=L.map(x=>`<div><b style='background:${x[0]?'#12b76a':'#f04438'}'>${x[0]?'✓':'✕'}</b>${x[1]}</div>`).join('')+(info?'':'<p class="sub2">Upload a real photo to check pixel size and file size. Samples only show the layout.</p>');
 const p=$('pvw'),fw=240,fh=Math.round(fw/t.box),a=$('ac'),g=p.getContext('2d');p.width=fw;p.height=fh;g.fillStyle='#fff';g.fillRect(0,0,fw,fh);
 const s=tgk==='mkt'?Math.min(fw/a.width,fh/a.height):Math.max(fw/a.width,fh/a.height);g.drawImage(a,(fw-a.width*s)/2,(fh-a.height*s)/2,a.width*s,a.height*s);
}
/* store consistency lab */
const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
$('lbp').onclick=()=>$('lbf').click();
$('lbf').onchange=async e=>{
 const fs=[...e.target.files];e.target.value='';
 if(fs.length<3||fs.length>10){$('lbr').innerHTML='<p class="er">Pick between 3 and 10 photos.</p>';return}
 const u=U();if(left(u)<=0){$('lim').hidden=false;return}
 $('lbr').textContent='Analyzing...';const ok=[];let bad=0;
 for(const f of fs){
  if(!/^image\/(jpeg|png|webp|gif)$/.test(f.type)||f.size>15*1048576){bad++;continue}
  try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=URL.createObjectURL(f)});ok.push({im,f,r:scoreImg(im),ar:im.width/im.height})}catch(x){bad++}
 }
 if(ok.length<3){$('lbr').innerHTML=`<p class="er">Need at least 3 valid photos${bad?' ('+bad+' skipped)':''}.</p>`;return}
 if(u.use.d!==today())u.use={d:today(),n:0};u.use.n++;saveU(u);meter();
 lab.forEach(x=>URL.revokeObjectURL(x.im.src));lab=ok;labShow(bad);
};
function labShow(bad){
 const n=lab.length,mm=med(lab.map(x=>x.r.q.m)),ma=med(lab.map(x=>x.r.q.area))||.01,mx=med(lab.map(x=>x.ar)),mdx=med(lab.map(x=>x.r.q.dx)),mdy=med(lab.map(x=>x.r.q.dy)),mb=[0,1,2].map(c=>med(lab.map(x=>x.r.bg[c])));
 lab.forEach(x=>{const q=x.r.q,bd=Math.hypot(x.r.bg[0]-mb[0],x.r.bg[1]-mb[1],x.r.bg[2]-mb[2]);
  x.f=[Math.abs(q.m-mm)/40,bd/60,Math.abs(q.area/ma-1)/.5,Math.abs(x.ar-mx)/.15,Math.hypot(q.dx-mdx,q.dy-mdy)/.15];x.why=[];
  if(x.f[0]>1)x.why.push(`Brightness ${Math.round(q.m)} vs typical ${Math.round(mm)}: ${q.m>mm?'brighter':'darker'} than your other photos.`);
  if(x.f[1]>1)x.why.push(`Backdrop color differs from your typical backdrop (color distance ${Math.round(bd)}).`);
  if(x.f[2]>1)x.why.push(`Product fills ${Math.round(q.area*100)}% of the frame vs typical ${Math.round(ma*100)}%.`);
  if(x.f[3]>1)x.why.push(`Shape ${x.ar.toFixed(2)} vs typical ${mx.toFixed(2)}.`);
  if(x.f[4]>1)x.why.push('Product sits in a different spot in the frame.')});
 const sc=[0,1,2,3,4].map(k=>cl(100-70*Math.min(1.4,lab.reduce((t,x)=>t+x.f[k],0)/n))),L=['Brightness','Backdrop','Product scale','Shape','Position'],tot=cl(sc.reduce((a,b)=>a+b,0)/5),fl=lab.filter(x=>x.why.length).length;
 $('lbr').innerHTML=`<div class='lbs'><div class='dn'>${tot}</div><div><b>Store consistency</b><div class='sub2'>${fl} of ${n} photos stand out${bad?', '+bad+' skipped':''}</div></div></div>`+L.map((l,i)=>`<div class='bar2'><span>${l}</span><div class='trk'><i style='width:${sc[i]}%;background:${bc(sc[i])}'></i></div><em>${sc[i]}</em></div>`).join('')+'<div class="lg">'+lab.map((x,i)=>`<div class='lt ${x.why.length?'fl':''}'><img src='${x.im.src}' alt='Photo ${i+1}'><b>${x.why.length?'Flagged':'Matches'}</b><ul>${x.why.map(w=>`<li>${w}</li>`).join('')}</ul><button class='btn alt' data-o='${i}'>Open</button></div>`).join('')+'</div><p class="sub2">Scores come from measured differences between your photos: brightness, backdrop color, product size, shape and position. The thresholds are simple rules, not an AI model.</p>';
 $('lbr').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const x=lab[+b.dataset.o];snap(()=>{info={w:x.im.width,h:x.im.height,kb:x.f.size/1024};srcImg=x.im;fromImg(x.im)},true);scrollTo({top:0,behavior:'smooth'})});
}
/* photo director: fixed rules only, no AI model */
$('qgo').onclick=()=>{
 const cat=$('qc').value,lt=$('ql').value,bud=+$('qb').value,eq=[...document.querySelectorAll('[name=eq]:checked')].map(x=>x.value),has=k=>eq.includes(k),S=[],tips=[];
 let lp='none';
 if(has('window')&&lt!=='dark'){lp='window';S.push(['Light','Put your table beside the window so it lights the product from one side. Shoot in the brightest part of the day and turn the room lights off.'])}
 else if(has('desk lamp')){lp='lamp';S.push(['Light','Place the desk lamp at 45 degrees to one side and a little above the product, about 40 cm away. Turn other lights off so colors stay consistent.'])}
 else S.push(['Light','Without a window or lamp, bounce your phone flashlight off a white wall, or move to the brightest spot you have. Avoid direct flash.']);
 const fill=has('white paper')||has('cardboard');
 if(has('white paper'))S.push(['Fill light','Stand a sheet of white paper opposite the light so it bounces light into the shadows.']);
 else if(has('cardboard'))S.push(['Fill light','Cover a piece of cardboard with white paper or foil and stand it opposite the light as a reflector.']);
 S.push(['Backdrop',has('white paper')?'Curve a sheet of white paper from the table up the wall behind the product so there is no visible edge.':has('cardboard')?'Stand the cardboard behind the product as a plain backdrop. Pick the side that contrasts with your product.':'Use a plain wall or a clean cloth with no pattern, 30 cm behind the product.']);
 S.push(['Product position','Place the product in the middle, about 30 cm in front of the backdrop, at the edge of the table nearest the camera.']);
 S.push(['Camera angle',{Food:'Shoot flat dishes from straight above. Shoot tall food from the front at 20 to 30 degrees.',Fashion:'Lay clothes flat and shoot straight down, or hang them on a plain wall and shoot from the front at chest height.',Beauty:'Shoot at eye level, slightly from above (about 15 degrees), with the label facing the camera.',Handmade:'Start at 45 degrees, then add a straight-on shot and a close-up of the craft detail.',Other:'Start at 45 degrees, slightly above the product, with the whole product in view.'}[cat]]);
 S.push(['Camera',has('tripod')?'Mount the phone on the tripod at your chosen angle and use the timer.':has('phone')?'Rest the phone on a stack of books and use the 2-second timer. Tap the product to focus.':'Use any camera and keep it steady against a table or wall.']);
 if(bud>=1)tips.push('Upgrade idea: a white foam board or poster board costs a few dollars and works as backdrop and reflector.');
 if(bud>=2)tips.push('Upgrade idea: a small phone tripod and a daylight lamp give consistent results at night.');
 const lg=lp==='window'?'<rect x="8" y="70" width="10" height="80" fill="#ffe14a" stroke="#11151c"/><text x="4" y="166" font-size="10">window</text><path d="M24 110L118 100" stroke="#f79009" stroke-width="3" stroke-dasharray="5 4"/>':lp==='lamp'?'<circle cx="45" cy="80" r="12" fill="#ffe14a" stroke="#11151c"/><text x="30" y="108" font-size="10">lamp</text><path d="M56 88L124 98" stroke="#f79009" stroke-width="3" stroke-dasharray="5 4"/>':'';
 const fl=fill?'<rect x="262" y="75" width="8" height="60" fill="#fff" stroke="#11151c"/><text x="266" y="150" font-size="10" text-anchor="middle">reflector</text>':'';
 const sv=`<svg viewBox='0 0 300 230' role='img' aria-label='Top-down setup diagram'><rect x='40' y='20' width='220' height='10' rx='3' fill='#e4e7ec'/><text x='150' y='14' text-anchor='middle' font-size='10' fill='#667085'>backdrop</text><circle cx='150' cy='100' r='22' fill='#3b3bff'/><text x='150' y='104' text-anchor='middle' font-size='10' fill='#fff'>product</text><path d='M135 205l15-26 15 26z' fill='#11151c'/><text x='150' y='224' text-anchor='middle' font-size='10'>camera</text>${lg}${fl}</svg>`;
 $('qp').innerHTML=`<div class='dgr'>${sv}</div><p class='sub2'>Every step below comes from fixed rules based on your answers. No AI model wrote this plan.</p><ol>${S.map(s=>`<li><b>${s[0]}</b><span class='rb'>Rule</span><br>${s[1]}</li>`).join('')}</ol>`+tips.map(t=>`<p class='sub2'>${t}</p>`).join('');
};
$('tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('play').dataset.on=b.dataset.t;[...$('tabs').children].forEach(x=>x.classList.toggle('on',x===b))};
syncTg();
/* v4: Fix My Photo, Selling Pack (real exports + ZIP) */
const scr=el=>el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
function prodBox(){const q=res&&res.q;if(!q||q.area<.005)return null;const [x0,y0,x1,y1]=q.bb,bw=x1-x0,bh=y1-y0,pad=.25*Math.max(bw,bh),cw=Math.min(W,Math.max(bw+2*pad,(bh+2*pad)*W/H)),ch=cw*H/W;if(cw>W*.95)return null;
 return[Math.round(Math.max(0,Math.min(W-cw,(x0+x1)/2-cw/2))),Math.round(Math.max(0,Math.min(H-ch,(y0+y1)/2-ch/2))),Math.round(cw),Math.round(ch)]}
function cropR(w,h,p){if(p.crop==='prod'&&p.box)return p.box;const ar={orig:w/h,sq:1,p45:.8}[p.crop]||w/h,z=p.z/100;let cw=w,ch=h;if(ar<w/h-.001)cw=h*ar;else if(ar>w/h+.001)ch=w/ar;cw=Math.round(cw/z);ch=Math.round(ch/z);return[Math.round((w-cw)/2),Math.round((h-ch)/2),cw,ch]}
function uiSync(){['xb','xc','xw','xs'].forEach((i,k)=>$(i).value=[stP.b,stP.c,stP.w,stP.s][k]);$('xz').value=stP.z;$('xr').value=stP.crop;$('xa').checked=stP.auto}
$('xr').onchange=()=>{stP.crop=$('xr').value;if(stP.crop==='prod'){stP.box=prodBox();if(!stP.box){stP.crop='orig';$('xr').value='orig';$('fres').hidden=false;$('fres').textContent='Could not find a clear product to crop around. Crop kept at original.'}}if(base)studio()};
function fixMy(){
 if(!base||!res)return;const q=res.q,A=[],N=[],p={b:0,c:0,w:0,s:0,crop:'orig',z:100,auto:false};
 if(q.m<125){p.b=Math.min(40,Math.round((140-q.m)/2.55));A.push('Brightness +'+p.b)}else if(q.m>215){p.b=-Math.min(30,Math.round((q.m-200)/2.55));A.push('Brightness '+p.b)}
 if(q.sd<45){p.c=Math.min(40,Math.round((55-q.sd)*1.2));A.push('Contrast +'+p.c)}
 const [r,g,b]=res.bg;
 if(Math.min(r,g,b)>150&&Math.abs(r-b)>12){p.w=Math.max(-20,Math.min(20,Math.round((b-r)/1.2)));A.push('Warmth '+(p.w>0?'+':'')+p.w+' (neutralizing a color cast in the backdrop)')}
 if(res.s[4]<60&&q.sat<.35){p.s=20;A.push('Saturation +20')}else if(q.sat>.8){p.s=-15;A.push('Saturation -15')}
 if(res.s[2]<70&&(q.area<.15||Math.hypot(q.dx,q.dy)>.1)){const bx=prodBox();if(bx){p.crop='prod';p.box=bx;A.push('Crop around the detected product')}}
 if(res.s[1]<70)N.push('Blur cannot be repaired by editing. Retake the photo with a steady camera.');
 if(res.s[3]<70)N.push('Background clutter cannot be removed here. Clear the background and reshoot.');
 stP=p;uiSync();studio();
 const w=wts(),o=score(),n=cl(fx.s.reduce((t,v,i)=>t+v*w[i],0));
 $('fres').hidden=false;
 $('fres').innerHTML=`<b>Fix My Photo</b><p>${A.length?'Applied: '+A.join(', ')+'.':'No light or color problem was big enough to adjust automatically.'}</p><div class='fsc'><span>Original<b>${o}</b></span><span>Edited<b>${n}</b></span></div><p>${n>o?'The edited image scores '+(n-o)+' points higher by the current scoring method.':n===o?'The score did not change.':'This edit scored lower by the current scoring method, so it did not help. Try adjusting manually or reset.'}</p>${N.map(t=>`<p class='sub2'>${t}</p>`).join('')}<div class='row'><button class='btn blue' data-a='keep'>Accept Changes</button><button class='btn alt' data-a='adj'>Keep Editing</button><button class='btn alt' data-a='reset'>Reset to Original</button><button class='btn alt' data-a='savev'>Save as New Version</button><button class='btn alt' data-a='dl'>Download Edited Photo</button></div><p class='sub2' id='fk'>Your original photo is never changed.</p>`;
 slide(50);scr($('tools'));
}
$('fmp').onclick=fixMy;
$('spb').onclick=()=>{if(base)scr($('pack'))};
$('fres').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
 if(a==='keep')$('fk').textContent='Edits kept. Download them or create a Selling Pack.';
 else if(a==='adj'){$('xb').focus();scr($('xb'))}
 else if(a==='reset'){$('xx').click()}};
/* selling pack */
const PK={social:{n:'Social media',w:1080,ar:'1',fmt:'jpeg',fit:'crop'},mkt:{n:'Online marketplace',w:1600,ar:'1',fmt:'jpeg',fit:'pad'},web:{n:'Business website',w:1600,ar:'1.778',fmt:'webp',fit:'crop'}};
let pkSel=new Set(['social']),pkOut=[];
const pm=t=>{$('pkm').textContent=t};
function renderPk(){
 const ks=Object.keys(PK);
 $('pkd').innerHTML=ks.map(k=>`<button data-k='${k}' class='${pkSel.has(k)?'on':''}' aria-pressed='${pkSel.has(k)}'>${PK[k].n}</button>`).join('')+`<button data-k='all' class='${pkSel.size===ks.length?'on':''}'>All destinations</button>`;
 $('pkc').innerHTML=ks.filter(k=>pkSel.has(k)).map(k=>{const t=PK[k],o=(f,L)=>L.map(x=>`<option value='${x[0]}' ${String(t[f])===x[0]?'selected':''}>${x[1]}</option>`).join('');
  return `<div class='spec'><b style='grid-column:1/-1'>${t.n}</b><label>Shape<select data-k='${k}' data-f='ar'>${o('ar',[['orig','Keep original shape'],['1','Square 1:1'],['0.8','Portrait 4:5'],['1.333','Landscape 4:3'],['1.778','Wide 16:9']])}</select></label><label>Width (px)<input type='number' data-k='${k}' data-f='w' min='200' max='4000' step='10' value='${t.w}'></label><label>Format<select data-k='${k}' data-f='fmt'>${o('fmt',[['jpeg','JPEG'],['png','PNG'],['webp','WebP']])}</select></label><label>Fit<select data-k='${k}' data-f='fit'>${o('fit',[['crop','Crop to fill'],['pad','Pad with white']])}</select></label></div>`}).join('');
}
$('pkd').onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;if(k==='all')Object.keys(PK).forEach(x=>pkSel.add(x));else if(pkSel.has(k))pkSel.delete(k);else pkSel.add(k);renderPk()};
$('pkc').onchange=e=>{const t=e.target,k=t.dataset.k,f=t.dataset.f;if(!k)return;let v=t.value;if(f==='w'){v=Math.round(+v);if(!(v>=200&&v<=4000)){pm('Width must be between 200 and 4000 px.');t.value=PK[k].w;return}}PK[k][f]=v;pm('')};
function pkSource(){
 const cr=cropR(W,H,stP);let c;
 if(srcImg){const k=srcImg.width/W,s=Math.min(1,4096/Math.max(cr[2]*k,cr[3]*k));c=document.createElement('canvas');c.width=Math.max(1,Math.round(cr[2]*k*s));c.height=Math.max(1,Math.round(cr[3]*k*s));const g=c.getContext('2d');g.drawImage(srcImg,cr[0]*k,cr[1]*k,cr[2]*k,cr[3]*k,0,0,c.width,c.height);fixPx(g,c.width,c.height,stP)}else c=$('ac');
 const q=res.q;let pb=null;if(q.area>.005)pb=[(q.bb[0]-cr[0])/cr[2]*c.width,(q.bb[1]-cr[1])/cr[3]*c.height,(q.bb[2]-cr[0])/cr[2]*c.width,(q.bb[3]-cr[1])/cr[3]*c.height];
 return{c,pb};
}
const MIME={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'},EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
async function pkGen(){
 if(!base||!res){pm('Analyze a photo first.');return}
 if(!pkSel.size){pm('Choose at least one destination.');return}
 pm('Creating images...');$('pkg').disabled=true;$('pkz').hidden=true;
 try{
  const E=pkSource(),out=[];
  for(const k of Object.keys(PK).filter(k=>pkSel.has(k))){
   const t=PK[k],c=E.c,ar=t.ar==='orig'?c.width/c.height:+t.ar,tw=Math.round(t.w),th=Math.max(1,Math.round(tw/ar)),o=document.createElement('canvas');o.width=tw;o.height=th;
   const g=o.getContext('2d'),warn=[];g.imageSmoothingQuality='high';
   if(t.fit==='pad'){g.fillStyle='#fff';g.fillRect(0,0,tw,th);const s=Math.min(tw/c.width,th/c.height);g.drawImage(c,(tw-c.width*s)/2,(th-c.height*s)/2,c.width*s,c.height*s);if(s>1)warn.push('The image was enlarged, so it may look soft.')}
   else{const s=Math.max(tw/c.width,th/c.height),vw=tw/s,vh=th/s;let x0=(c.width-vw)/2,y0=(c.height-vh)/2;
    if(E.pb){const [a,b,d,f]=E.pb;x0=Math.max(0,Math.min(c.width-vw,(a+d)/2-vw/2));y0=Math.max(0,Math.min(c.height-vh,(b+f)/2-vh/2));const tol=.02*Math.max(vw,vh);if(a<x0-tol||b<y0-tol||d>x0+vw+tol||f>y0+vh+tol)warn.push('This crop may cut off part of the product. Try Pad with white or another shape.')}
    g.drawImage(c,x0,y0,vw,vh,0,0,tw,th);if(s>1)warn.push('The image was enlarged, so it may look soft.')}
   const mime=MIME[t.fmt],blob=await new Promise(r=>o.toBlob(r,mime,.92));
   if(!blob)throw new Error('the browser could not encode '+t.fmt.toUpperCase());
   const ext=EXT[blob.type]||'img';if(blob.type!==mime)warn.push('This browser could not make '+t.fmt.toUpperCase()+', so it saved '+ext.toUpperCase()+'.');
   out.push({name:`snapscore-${k}-${tw}x${th}.${ext}`,n:t.n,blob,url:URL.createObjectURL(blob),tw,th,ext,warn});
  }
  pkOut.forEach(x=>URL.revokeObjectURL(x.url));pkOut=out;
  $('pkr').innerHTML=out.map(x=>`<div class='lt'><img src='${x.url}' alt='${x.n} preview'><b>${x.n}</b><div>${x.tw}×${x.th} px · ${x.ext.toUpperCase()} · ${Math.round(x.blob.size/1024)} KB</div>${x.warn.map(w=>`<div class='warn'>${w}</div>`).join('')}<a class='btn alt' href='${x.url}' download='${x.name}'>Download</a></div>`).join('');
  $('pkz').hidden=false;pm(`Created ${out.length} image${out.length>1?'s':''}. Previews show the real files.`);
 }catch(e){pm('Could not create the images: '+e.message)}
 finally{$('pkg').disabled=false}
}
$('pkg').onclick=pkGen;
$('pkr').onclick=e=>{const a=e.target.closest('a[download]');if(a)pm('Download started: '+a.getAttribute('download'))};
const CT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=-1;for(let i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
function makeZip(files){
 const parts=[],cd=[],enc=new TextEncoder(),d=new Date(),dt=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dd=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();let off=0;
 files.forEach(f=>{const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length,lh=new DataView(new ArrayBuffer(30));
  lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);
  parts.push(lh.buffer,nm,f.data);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
  cd.push(ch.buffer,nm);off+=30+nm.length+sz});
 const csz=cd.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csz,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cd,e.buffer],{type:'application/zip'});
}
$('pkz').onclick=async()=>{
 if(!pkOut.length)return;
 try{pm('Building ZIP...');const files=[];for(const x of pkOut)files.push({name:x.name,data:new Uint8Array(await x.blob.arrayBuffer())});
  const z=URL.createObjectURL(makeZip(files)),a=document.createElement('a');a.href=z;a.download='snapscore-selling-pack.zip';a.click();setTimeout(()=>URL.revokeObjectURL(z),5000);pm('ZIP download started with '+files.length+' file'+(files.length>1?'s':'')+'.')}
 catch(e){pm('Could not build the ZIP: '+e.message)}
};
renderPk();
/* v5: My Projects (IndexedDB), versions, camera, stronger upload checks */
let origBlob=null,origName='',curPh=null,tt=0,tU=[],cUrls=[];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sErr=e=>e&&e.name==='QuotaExceededError'?'Browser storage is full. Delete some photos or projects and try again.':'Storage problem: '+(e&&e.message?e.message:'unknown error');
const toast=t=>{const x=$('toast');x.textContent=t;x.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{x.hidden=true},4500)},pjmsg=toast;
const owner=()=>me||'guest',maxP=()=>me?50:3;
const toBlob=(c,t,q)=>new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('Could not encode the image')),t,q));
const edScore=()=>{const w=wts();return cl(fx.s.reduce((t,v,i)=>t+v*w[i],0))};
function loadBlobImg(b){return new Promise((ok,no)=>{const u=URL.createObjectURL(b),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);no(new Error('decode'))};i.src=u})}
async function load(f){
 msg('');if(!f)return;
 if(/heic|heif/i.test(f.type+f.name))return msg('HEIC/HEIF photos cannot be opened by most browsers. Export the photo as JPEG, or use Take Photo Now.');
 if(f.type?!f.type.startsWith('image/'):!/\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f.name))return msg('That file is not an image. Please choose a photo.');
 if(!f.size)return msg('That file is empty.');
 if(f.size>25*1048576)return msg('That file is over 25 MB. Please pick a smaller photo.');
 try{const im=await loadBlobImg(f);
  if(im.width*im.height>60e6)return msg('That image is over 60 megapixels. Please resize it first.');
  snap(()=>{info={w:im.width,h:im.height,kb:f.size/1024};srcImg=im;origBlob=f;origName=f.name;fromImg(im)});
 }catch(e){msg('This browser could not open that image. It may be corrupt or in an unsupported format. Try a JPEG or PNG.')}
}
$('cam').onclick=()=>{if(!/Android|iPhone|iPad/i.test(navigator.userAgent))msg('On computers this opens a file chooser. On a phone it opens your camera.');else msg('');$('camf').click()};
$('camf').onchange=e=>{load(e.target.files[0]);e.target.value=''};
/* storage */
let dbp=null;
function idb(){return dbp||(dbp=new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('IndexedDB is not available in this browser'));let r;try{r=indexedDB.open('snapscore',1)}catch(e){return no(e)}
 r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('projects',{keyPath:'id'});d.createObjectStore('photos',{keyPath:'id'}).createIndex('pid','pid')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error||new Error('Could not open storage'))}).catch(e=>{dbp=null;throw e}))}
const tx=async(st,mode,fn)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction(st,mode),r=fn(t.objectStore(st));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||new Error('Storage is full or blocked'))})};
const dbAll=st=>tx(st,'readonly',s=>s.getAll()),dbGet=(st,k)=>tx(st,'readonly',s=>s.get(k)),dbPut=(st,v)=>tx(st,'readwrite',s=>s.put(v)),dbDel=(st,k)=>tx(st,'readwrite',s=>s.delete(k));
async function projList(){const [P,F]=await Promise.all([dbAll('projects'),dbAll('photos')]);return P.filter(p=>p.owner===owner()).map(p=>{const f=F.filter(x=>x.pid===p.id).sort((a,b)=>b.modified-a.modified);return{...p,count:f.length,best:Math.max(0,...f.map(x=>x.best||0)),latest:f[0]}})}
/* dialog */
function ask(o){return new Promise(res=>{
 $('dt').textContent=o.title;$('dm').textContent=o.msg||'';const di=$('di'),ds=$('ds');di.hidden=!o.input;ds.hidden=!o.select;di.value=o.val||'';$('de').textContent='';
 if(o.select)ds.innerHTML=o.select.map(x=>`<option value='${x[0]}'>${esc(x[1])}</option>`).join('');
 $('dok').textContent=o.ok||'OK';$('dlg').hidden=false;(o.input?di:$('dok')).focus();
 const done=v=>{$('dlg').hidden=true;$('dok').onclick=$('dno').onclick=$('dx').onclick=null;res(v)};
 $('dok').onclick=()=>{if(o.input&&!di.value.trim()){$('de').textContent='Please enter a name.';return}done({v:o.input?di.value.trim():true,s:ds.value})};
 $('dno').onclick=$('dx').onclick=()=>done(null)})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dlg').hidden)$('dno').click()});
/* projects view */
async function projUI(){
 $('pjd').hidden=true;$('pjmain').hidden=false;srvUI();
 try{let L=await projList();const q=$('pjq').value.trim().toLowerCase(),s=$('pjs').value,any=L.length>0;
  if(q)L=L.filter(p=>p.name.toLowerCase().includes(q));
  L.sort((a,b)=>s==='best'?b.best-a.best:s==='new'?b.created-a.created:b.modified-a.modified);
  tU.forEach(u=>URL.revokeObjectURL(u));tU=[];
  $('pjg').innerHTML=L.length?L.map(p=>{let img='';if(p.latest&&p.latest.thumb){const u=URL.createObjectURL(p.latest.thumb);tU.push(u);img=`<img src='${u}' alt=''>`}
   return `<div class='lt pj'>${img}<b>${esc(p.name)}</b><div>${p.count} photo${p.count===1?'':'s'}${p.count?' \u00b7 best '+p.best+'/100':''}</div><div class='sub2'>Edited ${new Date(p.modified).toLocaleDateString()}</div><div class='row'><button class='btn blue' data-a='open' data-id='${p.id}'>Open</button><button class='btn alt' data-a='ren' data-id='${p.id}'>Rename</button><button class='btn alt' data-a='dup' data-id='${p.id}'>Duplicate</button><button class='btn alt' data-a='del' data-id='${p.id}'>Delete</button></div></div>`}).join(''):`<p class='sub2' style='grid-column:1/-1'>${any?'No projects match your search.':'No projects yet. Create one, or analyze a photo and press Save to Project.'}</p>`;
 }catch(e){$('pjg').innerHTML=`<p class='sub2' style='grid-column:1/-1'>${esc(sErr(e))}</p>`}
}
$('pjq').oninput=projUI;$('pjs').onchange=projUI;
$('pjnew').onclick=async()=>{
 const L=await projList().catch(()=>null);if(L&&L.length>=maxP())return toast(me?'Project limit reached.':'Guests can save up to 3 projects. Log in to save more.');
 const r=await ask({title:'New project',input:true,val:'My products',ok:'Create'});if(!r)return;
 try{await dbPut('projects',{id:uid(),name:r.v.slice(0,40),owner:owner(),created:Date.now(),modified:Date.now()});projUI();toast('Project created.')}catch(e){toast(sErr(e))}};
$('pjg').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.id,a=b.dataset.a;
 try{const P=await dbGet('projects',id);if(!P)return projUI();
  if(a==='open')return openProj(id);
  if(a==='ren'){const r=await ask({title:'Rename project',input:true,val:P.name,ok:'Rename'});if(r){P.name=r.v.slice(0,40);P.modified=Date.now();await dbPut('projects',P);if(P.sid&&me)api('PATCH','/api/projects/'+P.sid,{name:P.name}).catch(()=>{});projUI()}}
  if(a==='dup'){if((await projList()).length>=maxP())return toast(me?'Project limit reached.':'Guests can save up to 3 projects. Log in to save more.');
   const F=(await dbAll('photos')).filter(x=>x.pid===id),nid=uid();await dbPut('projects',{...P,id:nid,name:(P.name+' (copy)').slice(0,48),created:Date.now(),modified:Date.now()});for(const f of F)await dbPut('photos',{...f,id:uid(),pid:nid});projUI();toast('Project duplicated.')}
  if(a==='del'){const r=await ask({title:'Delete project?',msg:'"'+P.name+'" and all of its photos and versions will be permanently deleted from this browser.',ok:'Delete'});
   if(r){for(const f of (await dbAll('photos')).filter(x=>x.pid===id)){await dbDel('photos',f.id);if(curPh&&curPh.id===f.id)curPh=null}await dbDel('projects',id);if(P.sid&&me)api('DELETE','/api/projects/'+P.sid).catch(()=>{});projUI();toast('Project deleted.')}}
 }catch(err){toast(sErr(err))}};
async function openProj(id){
 try{const P=await dbGet('projects',id),F=(await dbAll('photos')).filter(x=>x.pid===id).sort((a,b)=>b.modified-a.modified);
  $('pjmain').hidden=true;const d=$('pjd');d.hidden=false;tU.forEach(u=>URL.revokeObjectURL(u));tU=[];
  d.innerHTML=`<button class='btn alt' data-a='back'>Back to projects</button><h3 style='margin-top:14px'></h3><p class='sub2'>${F.length} photo${F.length===1?'':'s'}. Opening a photo reloads its untouched original so you can keep editing.</p><div class='lg' id='pjp'></div><div id='pjc'></div>`;
  d.querySelector('h3').textContent=P.name;
  $('pjp').innerHTML=F.length?F.map(f=>{const u=URL.createObjectURL(f.thumb);tU.push(u);const lv=f.versions[f.versions.length-1];
   return `<div class='lt pj'><img src='${u}' alt=''><b>${esc(f.name)}</b><div>${f.versions.length} version${f.versions.length===1?'':'s'} \u00b7 ${lv?lv.score:f.oscore}/100</div><div class='row'><button class='btn blue' data-a='op' data-id='${f.id}'>Open</button><button class='btn alt' data-a='cm' data-id='${f.id}'>Compare</button><button class='btn alt' data-a='dp' data-id='${f.id}'>Delete</button></div></div>`}).join(''):"<p class='sub2'>This project is empty. Analyze a photo and press Save to Project.</p>";
 }catch(e){toast(sErr(e))}}
$('pjd').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,id=b.dataset.id;
 if(a==='back')return projUI();
 try{if(a==='op')return openPhoto(id);
  const ph=await dbGet('photos',id);if(!ph)return;
  if(a==='cm')return cmp(ph);
  if(a==='dp'){const r=await ask({title:'Delete photo?',msg:'"'+ph.name+'" and its versions will be permanently deleted from this browser.',ok:'Delete'});
   if(r){await dbDel('photos',id);if(ph.sid&&me)api('DELETE','/api/photos/'+ph.sid).catch(()=>{});if(curPh&&curPh.id===id)curPh=null;const P=await dbGet('projects',ph.pid);P.modified=Date.now();await dbPut('projects',P);openProj(ph.pid);toast('Photo deleted.')}}
 }catch(err){toast(sErr(err))}};
function cmp(ph){
 const opts=[['o','Original ('+ph.oscore+')'],...ph.versions.map((v,i)=>[v.id,'Version '+(i+1)+' ('+v.score+')'])],last=ph.versions.length?ph.versions[ph.versions.length-1].id:'o';
 const sel=(id,val,l)=>`<select class='fld' id='${id}' aria-label='${l}'>${opts.map(o=>`<option value='${o[0]}' ${o[0]===val?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
 $('pjc').innerHTML=`<h3 style='margin-top:20px'>Compare versions</h3><div class='duo'>${sel('ca','o','First version')}${sel('cb',last,'Second version')}</div><div class='duo' id='cim'></div><p class='sub2' id='cdl'></p>`;
 const draw=()=>{cUrls.forEach(u=>URL.revokeObjectURL(u));const get=id=>id==='o'?{b:ph.orig,s:ph.oscore}:(v=>({b:v.blob,s:v.score}))(ph.versions.find(x=>x.id===id)),A=get($('ca').value),B=get($('cb').value);
  cUrls=[URL.createObjectURL(A.b),URL.createObjectURL(B.b)];
  $('cim').innerHTML=`<div class='lt cm'><img src='${cUrls[0]}' alt='First version'><b>${A.s}/100</b></div><div class='lt cm'><img src='${cUrls[1]}' alt='Second version'><b>${B.s}/100</b></div>`;
  $('cdl').textContent='Score change: '+(B.s-A.s>=0?'+':'')+(B.s-A.s)+'. Scores come from this app\'s scoring method with the profile used at save time. They do not predict sales.'};
 $('ca').onchange=$('cb').onchange=draw;draw();
}
async function openPhoto(id,vid){
 try{const ph=await dbGet('photos',id);if(!ph)return toast('That photo no longer exists.');
  const im=await loadBlobImg(ph.orig);go('home');
  snap(()=>{info={w:im.width,h:im.height,kb:ph.orig.size/1024};srcImg=im;origBlob=ph.orig;origName=ph.name;curPh={pid:ph.pid,id:ph.id};fromImg(im)},true,true);
  const v=ph.versions.find(x=>x.id===vid)||ph.versions[ph.versions.length-1];
  if(v&&base){stP=Object.assign({b:0,c:0,w:0,s:0,crop:'orig',z:100,auto:false},v.settings);uiSync();studio();$('fres').hidden=false;$('fres').textContent='Reopened "'+ph.name+'" with version '+(ph.versions.indexOf(v)+1)+'. Keep editing, then press Save as New Version.'}
 }catch(e){toast('Could not open that photo: '+(e.message==='decode'?'the stored image could not be read.':sErr(e)))}}
/* save to project / new version */
async function origBlobFor(){if(origBlob)return origBlob;const c=document.createElement('canvas');
 if(srcImg){const s=Math.min(1,4096/Math.max(srcImg.width,srcImg.height));c.width=Math.round(srcImg.width*s);c.height=Math.round(srcImg.height*s);c.getContext('2d').drawImage(srcImg,0,0,c.width,c.height)}else{c.width=base.width;c.height=base.height;c.getContext('2d').drawImage(base,0,0)}
 return toBlob(c,srcImg?'image/jpeg':'image/png',.95)}
async function thumbOf(c){const s=160/Math.max(c.width,c.height),t=document.createElement('canvas');t.width=Math.max(1,Math.round(c.width*s));t.height=Math.max(1,Math.round(c.height*s));t.getContext('2d').drawImage(c,0,0,t.width,t.height);return toBlob(t,'image/jpeg',.7)}
async function saveVersion(){
 if(!base||!res||!fx)return toast('Analyze a photo first.');
 try{let ph=curPh?await dbGet('photos',curPh.id):null;
  if(!ph){
   const P=await projList(),a=await ask({title:'Save to project',msg:'Saved in this browser only. Your original photo is stored separately from edits.',select:[['__new','New project...'],...P.map(p=>[p.id,p.name])],ok:'Next'});if(!a)return;
   let pid=a.s;
   if(pid==='__new'){if(P.length>=maxP())return toast(me?'Project limit reached.':'Guests can save up to 3 projects. Log in to save more.');
    const n=await ask({title:'Name your project',input:true,val:'My products',ok:'Create'});if(!n)return;pid=uid();await dbPut('projects',{id:pid,name:n.v.slice(0,40),owner:owner(),created:Date.now(),modified:Date.now()})}
   ph={id:uid(),pid,name:(origName||'Sample photo').slice(0,60),created:Date.now(),modified:Date.now(),orig:await origBlobFor(),w:srcImg?srcImg.width:base.width,h:srcImg?srcImg.height:base.height,oscore:score(),versions:[],best:0,thumb:null};
  }
  const E=pkSource().c,blob=await toBlob(E,'image/jpeg',.92),sc=edScore();
  ph.versions.push({id:uid(),created:Date.now(),blob,settings:{...stP},score:sc,scores:fx.s,prof:cur});
  ph.best=Math.max(ph.best||0,sc,ph.oscore);ph.thumb=await thumbOf(E);ph.modified=Date.now();
  await dbPut('photos',ph);const P2=await dbGet('projects',ph.pid);P2.modified=Date.now();await dbPut('projects',P2);await syncMeta(ph,P2);
  curPh={pid:ph.pid,id:ph.id};toast('Saved as version '+ph.versions.length+' in "'+P2.name+'".');
 }catch(e){toast('Could not save: '+sErr(e))}
}
$('svp').onclick=$('svv').onclick=saveVersion;
$('fres').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
 if(a==='keep')$('fk').textContent='Changes accepted. Save them as a new version or download them.';
 else if(a==='adj'){$('xb').focus();scr($('xb'))}
 else if(a==='reset'){$('xx').click();$('fres').hidden=false;$('fres').textContent='Reset to your original photo.'}
 else if(a==='savev')saveVersion();
 else if(a==='dl')$('dlb').click()};
idb().catch(e=>{$('pjn').textContent='Saving projects is not available here: '+e.message});
/* v6: server accounts, database sync, Gemini */
let gemRes=null;
async function api(method,url,body){
 const r=await fetch(url,{method,credentials:'same-origin',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 let j=null;try{j=await r.json()}catch(e){}
 if(!r.ok){const e=new Error((j&&j.error)||'Request failed ('+r.status+')');e.status=r.status;throw e}
 return j}
function setSession(u){me=u.email;const us=users();us[me]=Object.assign({plan:'free',use:{d:'',n:0},hist:[],w:[5,5,5,5,5,5],prof:'General'},us[me]||{},{name:u.name});delete us[me].hash;delete us[me].salt;LS.set('ss_users',us);cur=us[me].prof||'General'}
async function authInit(){
 try{localStorage.removeItem('ss_me');const us=users();Object.values(us).forEach(x=>{delete x.hash;delete x.salt});LS.set('ss_users',us)}catch(e){}
 try{const j=await api('GET','/api/auth/me');setSession(j.user)}catch(e){}
 acct();meter();hist();}
const slimQ=()=>{const o={},q=res.q;['m','sd','lv','clip','area','dc','tsd','sat','rm','dx','dy'].forEach(k=>{if(typeof q[k]==='number'&&isFinite(q[k]))o[k]=Math.round(q[k]*1000)/1000});['light','focus','framing','backdrop','pop','feed'].forEach((k,i)=>o[k]=res.s[i]);return o};
async function syncMeta(ph,P){
 if(!me)return;
 try{
  if(!P.sid){P.sid=(await api('POST','/api/projects',{name:P.name})).id;await dbPut('projects',P)}
  const v=ph.versions[ph.versions.length-1];
  if(!ph.sid){ph.sid=(await api('POST','/api/projects/'+P.sid+'/photos',{name:ph.name,width:ph.w,height:ph.h,localRef:ph.id,analysis:{profile:cur,overall:ph.oscore,scores:res.s,measurements:slimQ(),gemini:gemRes}})).id;await dbPut('photos',ph)}
  await api('POST','/api/photos/'+ph.sid+'/versions',{settings:v.settings,score:v.score,scores:v.scores,localRef:v.id,profile:v.prof});
 }catch(e){toast('Saved on this device. Could not sync to your account: '+e.message)}
}
async function srvUI(){
 const b=$('srv');if(!me){b.hidden=true;return}b.hidden=false;
 try{const j=await api('GET','/api/projects');
  $('srvl').innerHTML=j.projects.length?j.projects.map(p=>`<div class='lt'><b>${esc(p.name)}</b><div>${p.photoCount} photo${p.photoCount===1?'':'s'}${p.best!=null?' \u00b7 best '+p.best+'/100':''}</div><div class='sub2'>Updated ${new Date(p.updatedAt).toLocaleDateString()}</div></div>`).join(''):`<p class='sub2' style='grid-column:1/-1'>Nothing saved to your account yet. Save a photo to a project while logged in.</p>`;
 }catch(e){$('srvl').innerHTML=`<p class='sub2' style='grid-column:1/-1'>${esc(e.message)}</p>`}
}
function renderGem(u){
 const g=$('gem'),A=gemRes,sec=(t,l)=>l&&l.length?`<p><b>${t}</b></p><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
 g.innerHTML=`<b>Gemini observations</b><p class='sub2'>Written by an AI model that looked at the photo. These are suggestions, not measurements, and they can be wrong. Your score still comes from local measurements.</p>${A.product?`<p><b>Product:</b> ${esc(A.product)}</p>`:''}${sec('Lighting',A.lighting)}${sec('Background',A.background)}${sec('Composition',A.composition)}${sec('Visibility',A.visibility)}${sec('Recommendations',A.recommendations)}<p class='sub2'>AI uses today: ${u.used} of ${u.limit}.</p>`}
$('gmb').onclick=async()=>{
 if(!res||!base)return toast('Analyze a photo first.');
 if(!me){toast('Log in to use AI Insights.');return openAuth('login')}
 const a=await ask({title:'Send photo to Google Gemini?',msg:'AI Insights resizes this photo and sends it through our server to the Google Gemini API. Do not continue if the photo shows anything private. Your local score is not affected.',ok:'Send photo'});if(!a)return;
 const g=$('gem');g.hidden=false;g.textContent='Asking Gemini... this can take up to 30 seconds.';$('gmb').disabled=true;
 try{
  const src=srcImg||base,s=Math.min(1,1280/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.round(src.width*s);c.height=Math.round(src.height*s);c.getContext('2d').drawImage(src,0,0,c.width,c.height);
  const blob=await toBlob(c,'image/jpeg',.85),fd=new FormData();fd.append('image',blob,'photo.jpg');fd.append('measurements',JSON.stringify(slimQ()));
  const r=await fetch('/api/analyze',{method:'POST',credentials:'same-origin',body:fd}),j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Request failed ('+r.status+')');
  gemRes=j.analysis;renderGem(j.usage);
 }catch(e){g.textContent='AI Insights are unavailable right now: '+e.message+' Your local analysis still works.'}
 finally{$('gmb').disabled=false}
};
/* init */
if(me&&!U()){me=null;LS.set('ss_me',null)}
if(U())cur=U().prof||'General';
acct();meter();hist();go('home');authInit();;
