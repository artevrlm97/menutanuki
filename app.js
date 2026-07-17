(function(){
  function syncVisibleViewport(){
    const width=Math.max(280,Math.round(window.visualViewport?.width||document.documentElement.clientWidth||window.innerWidth));
    document.documentElement.style.setProperty('--visible-viewport',`${width}px`);
  }
  syncVisibleViewport();
  window.addEventListener('resize',syncVisibleViewport,{passive:true});
  window.addEventListener('orientationchange',syncVisibleViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',syncVisibleViewport,{passive:true});
  const byId = id => document.getElementById(id);
  const splitPipe = value => String(value || '').split('|').map(x=>x.trim()).filter(Boolean);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const truthy = value => ['true','1','si','sí','yes'].includes(normalize(value));
  const categoryLabel = category => category === 'Mocktails' ? 'Sin alcohol' : category;
  const formatPrice = value => {
    const price = Number(String(value ?? '').replace(',','.'));
    return Number.isFinite(price) ? `Bs ${new Intl.NumberFormat('es-BO',{maximumFractionDigits:2}).format(price)}` : '';
  };

  function parseCSV(text){
    const rows=[]; let row=[], cell='', quote=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i], next=text[i+1];
      if(ch==='"'){
        if(quote && next==='"'){cell+='"'; i++;} else quote=!quote;
      } else if(ch===',' && !quote){row.push(cell); cell='';}
      else if((ch==='\n'||ch==='\r') && !quote){
        if(ch==='\r'&&next==='\n') i++;
        row.push(cell); cell=''; if(row.some(v=>v!=='')) rows.push(row); row=[];
      } else cell+=ch;
    }
    if(cell!==''||row.length){row.push(cell); rows.push(row)}
    const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());
    return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??''])));
  }

  async function loadData(){
    const url = window.MENU_DATA_URL || 'cocktails.csv';
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const data=parseCSV(await response.text());
      return {data, source:'csv'};
    }catch(error){
      console.warn('No se pudo cargar el CSV. Se usará la copia incrustada.',error);
      return {data:window.MENU_FALLBACK_DATA||[], source:'fallback'};
    }
  }

  function cleanRows(rows){
    return rows
      .filter(r=>truthy(r.activo))
      .map(r=>({...r,
        orden:Number(r.orden||9999),
        precioNumero:Number(String(r.precio ?? '').replace(',','.')),
        saboresList:splitPipe(r.sabores),
        ingredientesList:splitPipe(r.ingredientes)
      }))
      .sort((a,b)=>a.orden-b.orden);
  }
  function groupRows(rows){
    const map=new Map();
    rows.forEach(r=>{if(!map.has(r.grupo_id)) map.set(r.grupo_id,[]);map.get(r.grupo_id).push(r)});
    return [...map.values()];
  }
  function normalizeImageSource(value){
    let src=String(value||'').trim().replace(/\\/g,'/');
    if(!src) return '';
    const driveFile=src.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    const driveOpen=src.match(/[?&]id=([^&]+)/i);
    if(driveFile) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;
    if(/drive\.google\.com/i.test(src)&&driveOpen) return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;
    if(/dropbox\.com/i.test(src)) src=src.replace(/[?&]dl=0/i,'?raw=1');
    return src;
  }
  function imgOrFallback(row, cls=''){
    const source=normalizeImageSource(row.imagen);
    if(source) return `<img class="${cls}" src="${escapeAttr(source)}" alt="${escapeAttr(row.imagen_alt||row.nombre)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=fallbackHTML('${escapeAttr(row.grupo_nombre)}','${escapeAttr(row.color_acento)}')">`;
    return fallbackHTML(row.grupo_nombre,row.color_acento);
  }
  window.fallbackHTML=(name,color)=>`<div class="card-fallback" style="--accent:${escapeAttr(color||'#777')}"><span>${escapeHTML(name)}</span></div>`;
  function escapeHTML(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function escapeAttr(s){return escapeHTML(s).replace(/`/g,'&#96;');}
  function groupTastes(group){return [...new Set(group.flatMap(r=>r.saboresList))].slice(0,3)}
  function groupPrice(group){
    const values=group.map(r=>r.precioNumero).filter(Number.isFinite);
    if(!values.length) return '';
    const min=Math.min(...values), max=Math.max(...values);
    return min===max ? formatPrice(min) : `Desde ${formatPrice(min)}`;
  }
  function iconFor(row){
    if(row.icono) return row.icono;
    const text=normalize(`${row.variante} ${row.nombre}`);
    if(text.includes('frutilla')) return '🍓';
    if(text.includes('limon')) return '🍋';
    if(text.includes('pina')) return '🍍';
    if(text.includes('pepino')) return '🥒';
    if(text.includes('arandano')||text.includes('berry')) return '🫐';
    if(text.includes('maracuya')) return '🟡';
    if(text.includes('frutos rojos')||text.includes('cereza')) return '🍒';
    return '✦';
  }

  async function initIndex(){
    const loaded=await loadData(), rows=cleanRows(loaded.data), groups=groupRows(rows);
    if(loaded.source==='fallback') byId('sourceNotice')?.classList.add('show');

    const state={category:'Todos', tastes:new Set(), search:''};
    const tastes=[...new Set(rows.flatMap(r=>r.saboresList))].sort((a,b)=>a.localeCompare(b,'es'));
    const tasteBox=byId('tasteFilters');
    const searchInput=byId('menuSearch');
    const mobilePanel=byId('mobileFilterPanel');
    const mobileToggle=byId('mobileTasteToggle');
    const clearButton=byId('clearFilters');
    const activeCount=byId('activeFilterCount');

    tastes.forEach(t=>{
      const b=document.createElement('button');
      b.className='filter-btn taste';
      b.type='button'; b.textContent=t; b.dataset.taste=t;
      b.setAttribute('aria-pressed','false');
      b.onclick=()=>{
        state.tastes.has(t)?state.tastes.delete(t):state.tastes.add(t);
        b.classList.toggle('is-active');
        b.setAttribute('aria-pressed',String(state.tastes.has(t)));
        render();
      };
      tasteBox.appendChild(b);
    });

    document.querySelectorAll('[data-category]').forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll('[data-category]').forEach(b=>{
        b.classList.remove('is-active'); b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('is-active'); btn.setAttribute('aria-pressed','true');
      state.category=btn.dataset.category; render();
    });

    searchInput?.addEventListener('input',e=>{state.search=normalize(e.target.value);render()});
    mobileToggle?.addEventListener('click',()=>{
      const open=!mobilePanel.classList.contains('is-open');
      mobilePanel.classList.toggle('is-open',open);
      mobileToggle.setAttribute('aria-expanded',String(open));
    });
    clearButton?.addEventListener('click',()=>{
      state.category='Todos'; state.tastes.clear(); state.search='';
      if(searchInput) searchInput.value='';
      document.querySelectorAll('[data-category]').forEach(b=>{
        const active=b.dataset.category==='Todos';
        b.classList.toggle('is-active',active); b.setAttribute('aria-pressed',String(active));
      });
      document.querySelectorAll('[data-taste]').forEach(b=>{
        b.classList.remove('is-active'); b.setAttribute('aria-pressed','false');
      });
      render();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && mobilePanel?.classList.contains('is-open')){
        mobilePanel.classList.remove('is-open');
        mobileToggle?.setAttribute('aria-expanded','false'); mobileToggle?.focus();
      }
    });

    function updateControls(){
      const activeFilters=(state.category==='Todos'?0:1)+state.tastes.size+(state.search?1:0);
      if(activeCount){activeCount.textContent=String(activeFilters);activeCount.hidden=activeFilters===0;}
      if(clearButton) clearButton.hidden=activeFilters===0;
    }

    function render(){
      const filtered=groups.filter(group=>{
        const first=group[0];
        const categoryOK=state.category==='Todos'||first.categoria===state.category;
        const groupTaste=new Set(group.flatMap(r=>r.saboresList));
        const tasteOK=!state.tastes.size||[...state.tastes].every(t=>groupTaste.has(t));
        const haystack=normalize(group.map(r=>[r.nombre,r.variante,r.sabores,r.ingredientes].join(' ')).join(' '));
        return categoryOK&&tasteOK&&(!state.search||haystack.includes(state.search));
      });

      updateControls();
      const suffix=state.category==='Todos'?'':` · ${categoryLabel(state.category)}`;
      byId('resultMeta').textContent=`${filtered.length} ${filtered.length===1?'selección':'selecciones'}${suffix}`;
      byId('cocktailGrid').innerHTML=filtered.length?filtered.map(group=>{
        const first=group[0], visual=group.find(r=>r.imagen)||first;
        const variantText=group.length>1?group.map(r=>r.variante).filter(Boolean).join(' · '):categoryLabel(first.categoria);
        const optionLabel=group.length>1?`${group.length} opciones`:'Una opción';
        const price=groupPrice(group);
        return `<article class="card"><a href="cocktail.html?grupo=${encodeURIComponent(first.grupo_id)}&variante=${encodeURIComponent(first.id)}" aria-label="Ver detalles de ${escapeAttr(first.grupo_nombre)}">
          <div class="card-media">${imgOrFallback(visual)}${group.length>1?`<div class="variant-dots" aria-label="${group.length} variantes">${group.map(r=>`<span class="variant-dot" title="${escapeAttr(r.variante)}" style="background:${escapeAttr(r.color_acento)}"></span>`).join('')}</div>`:''}</div>
          <div class="card-body">
            <div class="card-overline"><span>${escapeHTML(categoryLabel(first.categoria))}</span><span>${escapeHTML(optionLabel)}</span></div>
            <div class="card-title-row"><h2 class="card-title">${escapeHTML(first.grupo_nombre)}</h2>${price?`<span class="card-price">${escapeHTML(price)}</span>`:''}</div>
            <p class="variant-line">${escapeHTML(variantText)}</p>
            <div class="taste-list">${groupTastes(group).map(t=>`<span class="taste-chip">${escapeHTML(t)}</span>`).join('')}</div>
            <span class="card-cta">Ver detalles <span aria-hidden="true">→</span></span>
          </div>
        </a></article>`;
      }).join(''):'<div class="empty">No encontramos una combinación con esos filtros.</div>';
    }
    render();
  }

  async function initDetail(){
    const loaded=await loadData(), rows=cleanRows(loaded.data), params=new URLSearchParams(location.search);
    const groupId=params.get('grupo')||rows[0]?.grupo_id;
    const group=rows.filter(r=>r.grupo_id===groupId);
    if(!group.length){location.href='index.html';return}
    let selected=group.find(r=>r.id===params.get('variante'))||group[0];

    function render(){
      document.title=`${selected.nombre} — Tanuki Bar`;
      byId('detailCategory').textContent=categoryLabel(selected.categoria);
      byId('detailTitle').textContent=selected.nombre;
      byId('detailPrice').textContent=formatPrice(selected.precioNumero);
      byId('detailTastes').innerHTML=selected.saboresList.map(t=>`<span class="taste-chip">${escapeHTML(t)}</span>`).join('');
      byId('ingredientList').innerHTML=selected.ingredientesList.map(i=>`<li>${escapeHTML(i)}</li>`).join('');
      const media=byId('detailImage');
      media.style.setProperty('--detail-accent',selected.color_acento||'#8d78d8');
      media.innerHTML=imgOrFallback(selected,'detail-photo');
      document.querySelector('.detail-hero')?.style.setProperty('--detail-accent',selected.color_acento||'#8d78d8');
      byId('dataState').textContent=normalize(selected.estado_datos).includes('pendiente')?'Ingredientes pendientes de validación en la hoja de datos.':'';
      byId('variantSection').style.display=group.length>1?'block':'none';
      byId('variantPicker').innerHTML=group.map(r=>`<button type="button" class="variant-option ${r.id===selected.id?'is-active':''}" data-id="${escapeAttr(r.id)}" style="--accent:${escapeAttr(r.color_acento)}" aria-pressed="${r.id===selected.id}">
        <span class="variant-icon" aria-hidden="true">${escapeHTML(iconFor(r))}</span>
        <span class="variant-copy"><span class="variant-name">${escapeHTML(r.variante||r.nombre)}</span><span class="variant-price">${escapeHTML(formatPrice(r.precioNumero))}</span></span>
      </button>`).join('');
      byId('variantPicker').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
        selected=group.find(r=>r.id===btn.dataset.id)||selected;
        history.replaceState({},'',`?grupo=${encodeURIComponent(groupId)}&variante=${encodeURIComponent(selected.id)}`);
        render();
        document.querySelector('.detail-info')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
    }
    render();
  }

  const page=document.body.dataset.page;
  if(page==='index') initIndex();
  if(page==='detail') initDetail();
})();
