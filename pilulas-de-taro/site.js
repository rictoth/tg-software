/*
 * Comportamento das páginas do Pílulas de Tarô em tgsd.com.br. Copiado para o site por
 * scripts/gerar-paginas-cartas.py; não edite a cópia do site. Sem dependências.
 *
 * Três coisas, e a página funciona sem nenhuma delas (sem JavaScript, os links continuam lá):
 * 1. a barra fixa do celular aparece depois que o botão da Play do topo sai da tela;
 * 2. "Tire uma carta": sorteia uma das 78 do baralho.json e vira a carta;
 * 3. o filtro do índice das cartas;
 * 4. a origem de quem chegou de fora (utm_source na URL) passa para o link da Play.
 */
(function () {
  "use strict";

  // 1. Barra fixa: só depois que o convite do topo sumiu, para não repetir o que já está à vista.
  var barra = document.querySelector(".barra-fixa");
  var alvo = document.querySelector("[data-observa-cta]");
  // Rolagem, e não IntersectionObserver: o observador só entrega o aviso quando a página desenha um
  // quadro, e uma aba que abre já rolada (volta do histórico) ficava sem a barra.
  // Uma medida por evento de rolagem é barata; sem requestAnimationFrame pelo mesmo motivo.
  if (barra && alvo) {
    var atualizar = function () {
      barra.classList.toggle("visivel", alvo.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
  }

  // 2. Tire uma carta.
  document.querySelectorAll("[data-sorteio]").forEach(function (caixa) {
    var carta = caixa.querySelector(".carta");
    var frente = caixa.querySelector(".frente img");
    var botao = caixa.querySelector("[data-tirar]");
    var convite = caixa.querySelector(".convite-sorteio");
    var resultado = caixa.querySelector(".resultado");
    var raiz = caixa.getAttribute("data-raiz") || "";
    var baralho = null;

    function carregar() {
      if (baralho) return Promise.resolve(baralho);
      return fetch(raiz + "cartas/baralho.json").then(function (r) { return r.json(); })
        .then(function (d) { baralho = d; return d; });
    }

    function mostrar(c) {
      frente.src = raiz + "cartas/img/" + c.img;
      frente.alt = "A carta " + c.nome;
      resultado.querySelector("[data-nome]").textContent = c.nome;
      resultado.querySelector("[data-frase]").textContent = c.frase;
      var chips = resultado.querySelector("[data-chips]");
      chips.innerHTML = "";
      c.palavras.forEach(function (p) {
        var li = document.createElement("li");
        li.textContent = p;
        chips.appendChild(li);
      });
      caixa.querySelector("[data-link]").href = raiz + "cartas/" + c.slug + "/";
      if (convite) convite.hidden = true;
      resultado.hidden = false;
      carta.classList.add("virada");
      botao.textContent = "Tirar outra carta";
    }

    function tirar() {
      carregar().then(function (d) {
        var c = d[Math.floor(Math.random() * d.length)];
        if (carta.classList.contains("virada")) {
          carta.classList.remove("virada");
          setTimeout(function () { mostrar(c); }, 450);
        } else {
          mostrar(c);
        }
      }, function () {
        // Sem o baralho (rede caiu), o índice das cartas ainda entrega o que a pessoa queria.
        window.location.href = raiz + "cartas/";
      });
    }

    botao.addEventListener("click", tirar);
    carta.addEventListener("click", tirar);
  });

  // 3. Filtro do índice: por nome ou palavra-chave, sem acento.
  var filtro = document.querySelector("[data-filtro]");
  if (filtro) {
    var tirarAcento = function (s) {
      return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    };
    var itens = document.querySelectorAll(".grade li[data-busca]");
    var grupos = document.querySelectorAll(".grupo");
    var vazio = document.querySelector(".vazio");
    filtro.addEventListener("input", function () {
      var q = tirarAcento(filtro.value.trim());
      var algum = false;
      itens.forEach(function (li) {
        var ok = !q || li.getAttribute("data-busca").indexOf(q) !== -1;
        li.hidden = !ok;
        if (ok) algum = true;
      });
      grupos.forEach(function (g) {
        g.hidden = !g.querySelector(".grade li:not([hidden])");
      });
      if (vazio) vazio.hidden = algum;
    });
  }

  // 4. A origem de quem chegou de fora (?utm_source=pinterest) vai para o referrer da Play no lugar
  // da do site. Sem isso, a instalação que veio de um pin aparece no painel como "site_cartas". A
  // página de entrada guarda a origem na sessão, e as páginas seguintes a herdam; o utm_medium (a
  // carta, o botão) continua o da página. Só letras minúsculas, números e "_", até 30.
  var origem = null;
  try {
    var daUrl = new URLSearchParams(window.location.search).get("utm_source");
    if (daUrl && /^[a-z0-9_]{1,30}$/.test(daUrl)) sessionStorage.setItem("origem", daUrl);
    origem = sessionStorage.getItem("origem");
  } catch (e) { /* sem sessionStorage, os links seguem com a origem do site */ }
  if (origem) {
    document.querySelectorAll('a[href*="play.google.com/store/apps/details"]').forEach(function (a) {
      a.href = a.href.replace(/referrer=utm_source%3D[a-z0-9_]+/, "referrer=utm_source%3D" + origem);
    });
  }
})();
