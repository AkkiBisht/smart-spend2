/* Pennywise web demo. All app data stays in this browser's localStorage. */
(() => {
  const CATEGORIES = ["Rent", "Food", "Transport", "Education", "Shopping", "Entertainment", "Health", "Bills", "Other"];
  const COLORS = ["#8276eb", "#59b899", "#7392ec", "#efa969", "#e78491", "#53abc3", "#a38adf", "#c4a25e", "#9ba5b4"];
  const ICONS = {Rent:"⌂",Food:"◒",Transport:"↗",Education:"▤",Shopping:"◇",Entertainment:"♫",Health:"✚",Bills:"▣",Other:"◌"};
  const STORE = "pennywise_student_tracker_v1";
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const today = new Date();
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const isoToday = () => `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const monthName = d => d.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const fresh = () => ({profile:null,budgets:{},transactions:[]});
  let state = loadState();
  let pendingDemoCode = "";
  let phoneWidget = null;
  let toastTimer;

  function loadState(){
    try { return {...fresh(), ...JSON.parse(localStorage.getItem(STORE)||"{}")} }
    catch { return fresh() }
  }
  function saveState(){ localStorage.setItem(STORE,JSON.stringify(state)); }
  function money(value){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(value)||0); }
  function esc(value){ return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function showToast(text){ const toast=$("#toast"); toast.textContent=text; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2600); }
  function currentTx(){ return state.transactions.filter(tx=>tx.date.slice(0,7)===monthKey(new Date())); }
  function totals(){
    const transactions=currentTx(); const byCategory={};
    transactions.forEach(tx=>byCategory[tx.category]=(byCategory[tx.category]||0)+Number(tx.amount));
    const spent=transactions.reduce((sum,tx)=>sum+Number(tx.amount),0);
    const income=Number(state.profile?.income)||0;
    return {transactions,byCategory,spent,income,remaining:income-spent,savingsTarget:Number(state.profile?.savingsTarget)||0};
  }
  function starterPlan(income,rent){
    const room=Math.max(0,Number(income)-Number(rent));
    return {Rent:Number(rent),Food:room*.30,Transport:room*.20,Education:room*.10,Health:room*.10,Other:room*.10,Shopping:0,Entertainment:0,Bills:0,"Savings target":room*.20};
  }

  // International Telephone Input supplies a searchable country list and dial codes.
  const phoneInput=$("#phone");
  if(window.intlTelInput){
    phoneWidget=window.intlTelInput(phoneInput,{initialCountry:"in",separateDialCode:true,nationalMode:true,autoPlaceholder:"polite",countryOrder:["in","us","gb","ca","au"],loadUtils:()=>import("https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.0/dist/js/utils.js")});
  }
  $("#sendOtp").addEventListener("click",()=>{
    const raw=phoneInput.value.trim();
    if(!raw){setLoginMessage("Enter your phone number to continue.",true);phoneInput.focus();return;}
    if(phoneWidget&&!phoneWidget.isValidNumber()){
      // If utility metadata is still loading, only require a plausible national number.
      if(raw.replace(/\D/g,"").length<5){setLoginMessage("Enter a valid number for the selected country.",true);return;}
    }
    pendingDemoCode=String(Math.floor(100000+Math.random()*900000));
    $("#otpArea").classList.remove("hidden");
    $("#otp").value="";
    setLoginMessage(`Demo only — no SMS was sent. Your test code is ${pendingDemoCode}.`);
    $("#otp").focus();
  });
  $("#verifyOtp").addEventListener("click",verifyDemoCode);
  $("#otp").addEventListener("keydown",event=>{if(event.key==="Enter")verifyDemoCode();});
  function setLoginMessage(message,error=false){const el=$("#loginMessage");el.textContent=message;el.style.color=error?"#bd555d":"#7771ca";}
  function verifyDemoCode(){
    if(!pendingDemoCode){setLoginMessage("Click Send demo code first.",true);return;}
    if($("#otp").value.trim()!==pendingDemoCode){setLoginMessage("That demo code doesn’t match. Check the code above and try again.",true);return;}
    $("#loginScreen").classList.add("hidden");$("#app").classList.remove("hidden");
    if(!state.profile){openModal("profileModal");}else renderAll();
  }

  function openModal(id){$("#"+id).classList.remove("hidden");}
  function closeModal(id){$("#"+id).classList.add("hidden");}
  $$('[data-close]').forEach(el=>el.addEventListener("click",()=>closeModal(el.dataset.close)));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")$$('.modal:not(.hidden)').forEach(m=>m.classList.add("hidden"));});

  $("#profileForm").addEventListener("input",updateProfilePreview);
  function updateProfilePreview(){
    const income=Number($("#monthlyIncome").value),rent=Number($("#monthlyRent").value);
    if(!income||rent>income){$("#profilePreview").textContent="Enter monthly support and rent (rent should not exceed support) to preview an editable starter plan.";return;}
    const plan=starterPlan(income,rent);
    $("#profilePreview").innerHTML=`After rent, ${money(income-rent)} remains. Suggested: ${money(plan.Transport)} travel · ${money(plan.Health)} medical · ${money(plan["Savings target"])} savings. You can edit every category.`;
  }
  $("#profileForm").addEventListener("submit",event=>{
    event.preventDefault();
    const name=$("#studentName").value.trim()||"Student",income=Number($("#monthlyIncome").value),rent=Number($("#monthlyRent").value);
    if(!income||rent<0||rent>income){showToast("Check income and rent amounts.");return;}
    const plan=starterPlan(income,rent);state.profile={name,income,rent,savingsTarget:plan["Savings target"]};delete plan["Savings target"];
    state.budgets={...state.budgets,...plan};saveState();closeModal("profileModal");renderAll();showToast("Your monthly plan is ready.");
  });

  function changePage(page){
    const titles={dashboard:"Overview",transactions:"Transactions",budget:"Budget plan",insights:"Smart insights"};
    $$(".page").forEach(el=>el.classList.remove("active-page"));$("#"+page+"Page").classList.add("active-page");
    $$(".nav-item[data-page]").forEach(el=>el.classList.toggle("active",el.dataset.page===page));$("#crumb").textContent=titles[page]||"Overview";
    if(page==="dashboard")drawChart();
    $(".sidebar").classList.remove("open");
  }
  $$(".nav-item[data-page]").forEach(button=>button.addEventListener("click",()=>changePage(button.dataset.page)));
  $$('[data-go]').forEach(button=>button.addEventListener("click",()=>changePage(button.dataset.go)));
  $("#menuToggle").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#logout").addEventListener("click",()=>{ $("#app").classList.add("hidden");$("#loginScreen").classList.remove("hidden");pendingDemoCode="";$("#otpArea").classList.add("hidden");$("#otp").value="";setLoginMessage("Demo mode only. No text message will be sent."); });
  $("#avatar").addEventListener("click",()=>{populateProfileForm();openModal("profileModal");});
  $("#editIncome").addEventListener("click",()=>{$("#studentName").value=state.profile?.name||"Student";$("#monthlyIncome").value=state.profile?.income||"";$("#monthlyRent").value=state.profile?.rent||0;updateProfilePreview();openModal("profileModal");});
  $("#reapplyPlan").addEventListener("click",()=>{
    if(!state.profile){openModal("profileModal");return;}
    const plan=starterPlan(state.profile.income,state.profile.rent);delete plan["Savings target"];
    state.budgets={...state.budgets,...plan};state.profile.savingsTarget=starterPlan(state.profile.income,state.profile.rent)["Savings target"];
    saveState();renderAll();showToast("Starter plan recalculated.");
  });
  function populateProfileForm(){if(state.profile){$("#studentName").value=state.profile.name;$("#monthlyIncome").value=state.profile.income;$("#monthlyRent").value=state.profile.rent;updateProfilePreview();}}

  const categoryFilter=$("#categoryFilter");
  CATEGORIES.forEach(category=>{
    const option=document.createElement("option");option.value=category;option.textContent=category;categoryFilter.appendChild(option);
    const expenseOption=option.cloneNode(true);$("#expenseCategory").appendChild(expenseOption);
  });
  $("#addExpenseTop").addEventListener("click",()=>openExpense());$("#addExpenseList").addEventListener("click",()=>openExpense());
  function openExpense(tx=null){
    $("#expenseTitle").textContent=tx?"Edit expense":"Add an expense";
    $("#expenseId").value=tx?.id||"";$("#expenseAmount").value=tx?.amount||"";$("#expenseCategory").value=tx?.category||"Food";
    $("#expenseDate").value=tx?.date||isoToday();$("#expenseDescription").value=tx?.description||"";$("#expensePayment").value=tx?.payment||"UPI";openModal("expenseModal");
  }
  $("#expenseForm").addEventListener("submit",event=>{
    event.preventDefault();const id=$("#expenseId").value||crypto.randomUUID();
    const tx={id,amount:Number($("#expenseAmount").value),category:$("#expenseCategory").value,date:$("#expenseDate").value,description:$("#expenseDescription").value.trim(),payment:$("#expensePayment").value};
    if(!tx.amount||tx.amount<=0||!tx.date){showToast("Enter a positive amount and valid date.");return;}
    const idx=state.transactions.findIndex(item=>item.id===id);if(idx>=0)state.transactions[idx]=tx;else state.transactions.unshift(tx);
    saveState();closeModal("expenseModal");renderAll();showToast(idx>=0?"Expense updated.":"Expense saved.");
  });

  $("#savePlan").addEventListener("click",()=>{
    const values={};let sum=0;
    $$("[data-budget]").forEach(input=>{const value=Number(input.value);if(value<0||!Number.isFinite(value)){showToast("Use zero or a positive amount for each category.");return;}values[input.dataset.budget]=value;sum+=value;});
    if(sum>state.profile.income){showToast("Your planned categories exceed your monthly support.");return;}
    state.budgets={...values};saveState();renderAll();showToast("Budget plan saved.");
  });
  $("#searchTransactions").addEventListener("input",renderTransactions);categoryFilter.addEventListener("change",renderTransactions);$("#monthFilter").value=monthKey(today);$("#monthFilter").addEventListener("change",renderTransactions);
  $("#currentMonth").textContent=monthName(today);

  function renderAll(){
    if(!state.profile)return;
    $("#welcome").textContent=`Good ${today.getHours()<12?"morning":today.getHours()<18?"afternoon":"evening"}, ${state.profile.name} 👋`;
    $("#avatar").textContent=(state.profile.name[0]||"S").toUpperCase();$("#incomeValue").textContent=money(state.profile.income);$("#budgetIncome").textContent=money(state.profile.income);
    const t=totals(),used=t.income?Math.max(0,t.spent/t.income*100):0,saved=t.income?Math.max(0,t.remaining/t.income*100):0;
    $("#spentValue").textContent=money(t.spent);$("#spentPct").textContent=`${Math.round(used)}% used`;$("#spentProgress").style.width=`${Math.min(100,used)}%`;
    $("#remainingValue").textContent=money(t.remaining);$("#remainingProgress").style.width=`${Math.min(100,Math.max(0,t.remaining/t.income*100))}%`;
    $("#savingsValue").textContent=money(t.savingsTarget);$("#savingsRate").textContent=`${Math.round(saved)}% available`;$("#savingsProgress").style.width=`${Math.min(100,t.savingsTarget?t.remaining/t.savingsTarget*100:0)}%`;
    renderPlan();renderRecent();renderTransactions();renderInsights();drawChart();
  }
  function renderPlan(){
    const container=$("#planList");container.innerHTML="";
    const entries=CATEGORIES.filter(c=>(Number(state.budgets[c])||0)>0).slice(0,6);
    entries.forEach(category=>{
      const planned=Number(state.budgets[category])||0,actual=totals().byCategory[category]||0,ratio=planned?actual/planned*100:0;
      const row=document.createElement("div");row.className="plan-row";row.innerHTML=`<span class="plan-name">${esc(category)}</span><span class="plan-value">${money(actual)} <span class="plan-note">/ ${money(planned)}</span></span><div class="plan-track"><div class="plan-fill" style="width:${Math.min(100,ratio)}%;background:${ratio>100?"#e88688":COLORS[CATEGORIES.indexOf(category)]}"></div></div>`;container.appendChild(row);
    });
    if(!entries.length)container.innerHTML='<p class="muted tiny">Add your monthly plan to see allocations here.</p>';
    renderBudgetRows();
  }
  function renderBudgetRows(){
    $("#budgetRows").innerHTML=CATEGORIES.map((category,index)=>{
      const actual=totals().byCategory[category]||0,planned=Number(state.budgets[category])||0;
      return `<div class="budget-row"><span class="budget-row-name"><i class="legend-dot" style="background:${COLORS[index]};display:inline-block;margin-right:7px"></i>${esc(category)}</span><span class="budget-row-actual">Spent ${money(actual)}</span><input class="input" type="number" min="0" step="1" value="${planned}" data-budget="${esc(category)}" aria-label="Planned ${esc(category)} budget"></div>`;
    }).join("");
    const plan=starterPlan(state.profile.income,state.profile.rent);$("#recSummary").innerHTML=Object.entries(plan).map(([name,value])=>`<div class="rec-line"><span>${esc(name)}</span><strong>${money(value)}</strong></div>`).join("");
  }
  function renderRecent(){
    const recent=[...currentTx()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    $("#recentList").innerHTML=recent.length?recent.map(tx=>`<div class="transaction-item"><span class="category-icon">${ICONS[tx.category]||"◌"}</span><div><div class="tx-title">${esc(tx.description||tx.category)}</div><div class="tx-sub">${esc(tx.category)} · ${formatDate(tx.date)}</div></div><span class="tx-amount">−${money(tx.amount)}</span></div>`).join(""):'<p class="muted tiny">No entries yet. Add your first expense to get started.</p>';
  }
  function formatDate(dateString){return new Date(dateString+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});}
  function renderTransactions(){
    const query=$("#searchTransactions").value.trim().toLowerCase(),cat=categoryFilter.value,month=$("#monthFilter").value;
    const records=[...state.transactions].filter(tx=>(!month||tx.date.startsWith(month))&&(cat==="All categories"||tx.category===cat)&&(`${tx.description} ${tx.category} ${tx.payment}`.toLowerCase().includes(query))).sort((a,b)=>b.date.localeCompare(a.date));
    $("#transactionRows").innerHTML=records.map(tx=>`<tr><td><div class="table-desc"><span class="category-icon">${ICONS[tx.category]||"◌"}</span><strong>${esc(tx.description||tx.category)}</strong></div></td><td>${esc(tx.category)}</td><td>${formatDate(tx.date)}</td><td>${esc(tx.payment)}</td><td class="align-right">−${money(tx.amount)}</td><td><button class="row-action" data-edit="${esc(tx.id)}" title="Edit">···</button></td></tr>`).join("");
    $("#emptyTransactions").classList.toggle("hidden",records.length>0);$("#transactionRows").querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{
      const tx=state.transactions.find(item=>item.id===button.dataset.edit);if(!tx)return;
      const choice=prompt(`Transaction: ${tx.description||tx.category}\nType EDIT to change it or DELETE to remove it.`);
      if(choice?.toUpperCase()==="EDIT")openExpense(tx);else if(choice?.toUpperCase()==="DELETE"){state.transactions=state.transactions.filter(item=>item.id!==tx.id);saveState();renderAll();showToast("Transaction deleted.");}
    }));
  }
  function renderInsights(){
    const t=totals(),top=Object.entries(t.byCategory).sort((a,b)=>b[1]-a[1]),topName=top[0]?.[0],topValue=top[0]?.[1]||0;
    const over=top.filter(([category,value])=>Number(state.budgets[category])>0&&value>Number(state.budgets[category]));
    const insights=[];
    if(topName)insights.push(`${topName} is your highest recorded category this month at ${money(topValue)}.`);
    if(over.length)insights.push(`${over[0][0]} is ${money(over[0][1]-Number(state.budgets[over[0][0]]))} over the plan you set.`);
    else insights.push("Your recorded spending is within the category limits you set so far.");
    insights.push(`After recorded expenses, ${money(Math.max(0,t.remaining))} remains from your monthly support.`);
    if(t.savingsTarget)insights.push(`Your starter savings target is ${money(t.savingsTarget)}. Actual savings are based on what you record.`);
    $("#dashboardInsight").textContent=insights[0]||"Your spending insights will appear here once you add expenses.";
    $("#insightCards").innerHTML=insights.map((text,index)=>`<article class="insight-card"><span class="insight-glyph">${index===0?"◉":"✦"}</span><p>${esc(text)}</p></article>`).join("");
    const max=top[0]?.[1]||1;$("#breakdownList").innerHTML=top.length?top.map(([category,value])=>`<div class="breakdown-row"><span>${esc(category)}</span><div class="breakdown-track"><div class="breakdown-fill" style="width:${Math.max(2,value/max*100)}%"></div></div><span class="breakdown-value">${money(value)}</span></div>`).join(""):'<p class="muted tiny">Record a few expenses to see your category breakdown.</p>';
  }
  function drawChart(){
    const canvas=$("#spendingChart"),ctx=canvas.getContext("2d"),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);ctx.scale(dpr,dpr);ctx.clearRect(0,0,rect.width,rect.height);
    const vals=Object.entries(totals().byCategory).filter(([,amount])=>amount>0),empty=$("#chartEmpty");empty.classList.toggle("hidden",vals.length>0);
    $("#legend").innerHTML="";if(!vals.length)return;
    const cx=rect.width*.5,cy=rect.height*.5,r=Math.min(78,rect.height*.4),inner=r*.63,total=vals.reduce((sum,[,amount])=>sum+amount,0);let angle=-Math.PI/2;
    vals.forEach(([category,amount])=>{const end=angle+amount/total*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,angle,end);ctx.arc(cx,cy,inner,end,angle,true);ctx.closePath();ctx.fillStyle=COLORS[CATEGORIES.indexOf(category)]||"#9ba5b4";ctx.fill();angle=end;
      const legend=document.createElement("span");legend.className="legend-item";legend.innerHTML=`<i class="legend-dot" style="background:${COLORS[CATEGORIES.indexOf(category)]||"#9ba5b4"}"></i>${esc(category)} <b>${money(amount)}</b>`;$("#legend").appendChild(legend);
    });
    ctx.textAlign="center";ctx.fillStyle="#8991a0";ctx.font="11px DM Sans, sans-serif";ctx.fillText("THIS MONTH",cx,cy-4);ctx.fillStyle="#263144";ctx.font="700 17px Manrope, sans-serif";ctx.fillText(money(total),cx,cy+19);
  }
  $("#monthBadge").addEventListener("click",()=>showToast(`Showing ${monthName(today)}.`));
  window.addEventListener("resize",()=>{if(!$("#app").classList.contains("hidden"))drawChart();});
  // Start this browser-only prototype at its OTP demo screen.
})();
