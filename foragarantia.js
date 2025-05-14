const fs = require("fs");
const puppeteer = require("puppeteer");
const axios = require("axios");
var posts = [];
const Sequelize = require("sequelize");
const { format } = require("date-fns");
const moment = require("moment");
var iDados = 0;
let dados = [];
let json = {};

class Vinculacao {
  acaoModel = require("../../../acaoModel/acaoModel");
  constructor() {
    this.acaoModel = new this.acaoModel();
  }

  async logando(i = 2, arr = []) {
    const browser = await puppeteer.launch({
        args: ["--disable-dev-shm-usage"],
        headless: false,
        timeout: 60000, // Aumente o tempo limite para 60 segundos (ajuste conforme necessário)
    });
    

    console.log("login");
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto("https://parceiros.electrolux.com.br/");
    await page.waitForTimeout(2000);
    //Login
    await page.waitForSelector("#email");
    await page.click("#email");
    await page.type("#email", "elericloud@gmail.com");
    await page.waitForTimeout(2000);
    //Senha
    await page.waitForSelector("#password");
    await page.click("#password");
    await page.type("#password", "Elux@7197");
    await page.waitForTimeout(2000);
    //Entrar
    await page.waitForSelector("#next");
    await page.click("#next");
    //Ordens de Serviço
    await page.waitForSelector(
      "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
    );
    await page.click(
      "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
    );
    // // Seleciona o status da OS SAE
    
    await page.waitForSelector("#main-content > app-service-order-list > div > div.row.mt-3.no-print > div:nth-child(1) > lib-elux-dropdown > div");
    await page.click("#main-content > app-service-order-list > div > div.row.mt-3.no-print > div:nth-child(1) > lib-elux-dropdown > div");
    await page.waitForTimeout(3000);
    // // Aguarda a lista de opções aparecer
    await page.waitForSelector(".dropdown-list");

    // Clica na opção "Open"
    await page.evaluate(() => {
      const options = Array.from(
        document.querySelectorAll(".dropdown-list li")
      );
      const openOption = options.find(
        (option) => option.textContent.trim() === "Fora de Garantia"
      );
      if (openOption) {
        openOption.click();
      }
    });
    teste.tomaOK(page);
    await page.waitForTimeout(5000);
  
    await teste.coletaDados(page, browser, i);
    return;
  }
  async coletaDados(page, browser, i, iListagem = 1) {

     // Seleciona o status da OS SAE
    await page.waitForSelector(".custom-dropdown");
    await page.click(".custom-dropdown");

    // Aguarda a lista de opções aparecer
    await page.waitForSelector(".dropdown-list");

    // Clica na opção "Open"
    await page.evaluate(() => {
      const options = Array.from(
        document.querySelectorAll(".dropdown-list li")
      );
      const openOption = options.find(
        (option) => option.textContent.trim() === "Sem contato consumidor"
      );
      if (openOption) {
        openOption.click();
      }
    });

    //Buscar
    await page.click("#main-content > app-service-order-list > div > div.row.mt-3.no-print > div:nth-child(4) > lib-elux-button > button > div:nth-child(2) > span")
    await page.waitForTimeout(3000);

    try {
        

    console.log(i);
    console.log(iListagem)
    let newPage;
    let tipoProduto = "9";
    let garantia_estendida = "0";
    let idEmpresa = 113;
    let Empresa = "electrolux";
    let statusAT = "5";
    var tipo_garantia = 4;
    
    if(i == 7 && iListagem == 1){
        i = 2;
        iListagem = 4;
        teste.coletaDados(page, browser, i, iListagem);
        return;
    }

    if(i == 7 && iListagem == 4){
      i = 2;
      iListagem = 5;
      teste.coletaDados(page, browser, i, iListagem);
      return;
    }

    if(i == 7 && iListagem == 5){
      i = 2;
      iListagem = 6;
      teste.coletaDados(page, browser, i, iListagem);
      return;
    }

    if(i == 7 && iListagem == 6){
      i = 2;
      iListagem = 7;
      teste.coletaDados(page, browser, i, iListagem);
      return;
    }

    if(i == 7 && iListagem == 7){
      i = 2;
      iListagem = 6;
      teste.coletaDados(page, browser, i, iListagem);
      return;
    }

    if(iListagem > 1){
          await page.click(`#main-content > app-service-order-list > div > div:nth-child(8) > div > lib-elux-datatable > div > div.table-footer > lib-elux-paginator > nav > ul > li:nth-child(${iListagem}) > div`);
          await page.waitForTimeout(4000);
    }

    console.log("localizando os atendimentos");
    
        // Espera o elemento ser encontrado, mas se não encontrar, não gera erro
        const elementExists = await page.$('#formularioMenu\\:panelComment_body > table > tbody > tr:nth-child(1) > td:nth-child(1) > textarea') !== null;
    
        if (elementExists) {
          // Lê o conteúdo do textarea se ele estiver presente
          const content = await page.$eval(
            '#formularioMenu\\:panelComment_body > table > tbody > tr:nth-child(1) > td:nth-child(1) > textarea',
            (textarea) => textarea.value // Obtém o conteúdo do textarea
          );
    
          console.log('Conteúdo do textarea:', content);
        } else {
          console.log('O seletor não foi encontrado na página.');
        }
     
        
    // Aguarda o seletor do link e obtém o href
    const linkSelector = `#main-content > app-service-order-list > div > div:nth-child(8) > div > lib-elux-datatable > div > div:nth-child(${i}) > div:nth-child(1) > a`;
    await page.waitForSelector(linkSelector);

    
    const href = await page.evaluate((selector) => {
      const link = document.querySelector(selector);
      return link ? link.href : null; // Retorna o #main-content > app-installed-products-view > div > div:nth-child(5) > div:nth-child(1) > div:nth-child(2) > span ou null se não encontrado
    }, linkSelector);

    if (href) {
      // Abre uma nova página com o href obtido
      newPage = await browser.newPage();
      await newPage.goto(href);
    } else {
      console.log("Link não encontrado.");
    }

    //Coleta Sinistro
    await newPage.waitForTimeout(5000);
    const divSinistroOS = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Sinistro = divSinistroOS[0];
    console.log("Sinistro", Sinistro);

    let verificacao = await teste.verificaSinistro(Sinistro); 
     console.log("Verificacao", verificacao.length);
     
     if (verificacao.length != 0) {
      setTimeout(() => {
        console.log("Delayed for 5 seconds.");
        teste.coletaDados(page, browser, ++i, iListagem);
      }, "1000");  
      newPage.close();
      return;
      }
      
    await newPage.waitForTimeout(1000);

    //Defeito
    const divDefeito = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(19) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Defeito = divDefeito[0];
    console.log("Defeito", Defeito);
    await newPage.waitForTimeout(1000);

    //Tipo De OS
    const divTipoOS = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(19) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var tipoOS = divTipoOS[0];
    console.log("tipoOS", tipoOS);
    await newPage.waitForTimeout(1000);

    if (tipoOS == "Fora de Garantia") {
      idEmpresa = "113";
      Empresa = "electrolux fora de garantia";
      tipo_garantia = 2;
    }

    if (tipoOS == "Fora de Garantia com autorização") {
      idEmpresa = "101";
      Empresa = "electrolux";
      tipo_garantia = 3;
      statusAT = "96";
    }

    if (tipoOS == "Atendimento Seguradora") {
      garantia_estendida = "1";
      tipo_garantia = 1;
    }

    console.log("Tipo Garantia:", tipo_garantia);


    //Rua
    const divRua = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(9) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Rua = divRua[0];
    console.log("Rua", Rua);
    await newPage.waitForTimeout(1000);

    //Bairro
    const divBairro = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(10) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Bairro = divBairro[0];
    console.log("Bairro", Bairro);
    await newPage.waitForTimeout(1000);

    //Cidade
    const divCidade = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(12) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Cidade = divCidade[0];
    console.log("Cidade", Cidade);
    await newPage.waitForTimeout(1000);

    //Cep
    const divCep = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(11) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var CEP = divCep[0];
    console.log("CEP", CEP);
    await newPage.waitForTimeout(1000);

    //Estado
    const divEstado = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(13) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Estado = divEstado[0];
    console.log("Estado", Estado);
    await newPage.waitForTimeout(2000);

    await newPage.waitForSelector(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div:nth-child(1) > div:nth-child(4) > span > a"
    );
    await newPage.click(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div:nth-child(1) > div:nth-child(4) > span > a"
    );
    await newPage.waitForTimeout(5000);

    //Nome Cliente
    const divNomeCliente = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(6) > div:nth-child(1) > div:nth-child(2) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Cliente = divNomeCliente[0];
    console.log("Cliente", Cliente);

    //CPF Cliente
    const divCPFCliente = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(6) > div:nth-child(1) > div:nth-child(2) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var CPF = divCPFCliente[0];
    console.log("CPF", CPF);

    //Telefone Cliente
    const divTelefoneCliente = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(6) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(2) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Telefone = divTelefoneCliente[0];
    console.log("Telefone", Telefone);

    //Telefone Cliente
    const divTelefoneCliente2 = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(6) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(3) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var Telefone2 = divTelefoneCliente2[0];
    console.log("Telefone", Telefone2);

    //Email Cliente
    const divEmailCliente = await newPage.$$eval(
      "#main-content > ng-component > div > div:nth-child(6) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(6)",
      (elements) => elements.map((el) => el.innerText)
    );
    var Email = divEmailCliente[0];
    console.log("Email", Email);

    //Volta uma página
    await newPage.waitForTimeout(5000);
    await newPage.goBack();

    //Clicka no produto instalado
    await newPage.waitForSelector(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(2) > span > a"
    );
    await newPage.click(
      "#main-content > ng-component > div > div:nth-child(4) > div:nth-child(3) > div.col-12.col-lg-6.mt-4.mt-lg-0 > div:nth-child(2) > span > a"
    );

    await newPage.waitForTimeout(10000);
    
    //Produto Cliente
    const divProdutoCliente = await newPage.$$eval(
      "#main-content > app-installed-products-view > div > div:nth-child(5) > div:nth-child(1) > div:nth-child(2) > span",
      (elements) => elements.map((el) => el.innerText)
    );
    var produto = divProdutoCliente[0];
    console.log("Produto", produto);


    dados[iDados] = {
      Sinistro: Sinistro.trim(),
      Defeito: Defeito,
      produto: produto,
      TipoProduto: "9",
      Rua: Rua,
      Bairro: Bairro,
      Cidade: Cidade.trim(),
      Cep: CEP.trim(),
      Estado: Estado.trim(),
      Nome: Cliente.trim(),
      Cpf: CPF,
      telefone: Telefone,
      telefone2: Telefone2,
      email: Email,
      IdEmpresa: idEmpresa,
      garantia_estendida: garantia_estendida,
      Empresa: Empresa,
      status: statusAT,
      tipo_os: "",
      tipo_garantia: tipo_garantia,
      //SVO-16695446
    };
    // iDados++;
    fs.writeFileSync("dadosfora.json", JSON.stringify(dados).trim());
    console.log(dados);
    await teste.enviaOs(browser);
    await newPage.waitForTimeout(2000);
    await newPage.close();
    i++;
    await teste.coletaDados(page, browser, i, iListagem);
    return;
    } catch (error) {
    console.log(error);
    // await teste.enviaOs(browser);
    if(browser){
    await browser.close();
    teste.reset();
    }else{
      teste.reset();
    }
    return;
    }   
  }

   async loopEnvia(content, browser, i = 0, tentativas = 1) {
      await axios
        .post(
          "https://gsplanaltec.com/GerenciamentoServicos/APIControle/ImportacaoElectrolux",
          [content[i]],
          {
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
            },
          }
        )
        .then(function (response) {
          console.log("Response", response);
        })
  
        .catch(function (error) {
          console.error(error);
        });
  
  
      tentativas = 1;
      i++;
  
      if (i <= content.length - 1)
        await teste.loopEnvia(content, browser, i, tentativas);
      else {
        console.log("Enviado!");
        // browser.close();
  
        // setTimeout(function () {
        //   teste.logando();
        // }, 600000);
      }
    }

  async verificaSinistro(e){
      let ip = await axios.post("https://gsplanaltec.com/consultaBot/",
          {
              sqlQuery:`SELECT Sinistro FROM importados_zurich WHERE Sinistro = '${e}' AND id_emp IN ('101', '113', '144')`
          },
      {
          headers: {
              "Content-Type": "application/json; charset=UTF-8",
          },
      }).then(function(response) {
          return response.data;
      }).catch(function (error) {
          console.error(error);
      });
      return ip;
  }

  async carregaOS() {
    const response = await this.acaoModel.manualQuery({
      bd: "servico_bd",
      tabela: "importados_zurich",
      query: `SELECT 
          IZ.id,
          IZ.OS,
          IZ.prod_recolhido,
          IZ.Sinistro,
          IZ.data,
          @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
          IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
          IZ.status,
          S.sel_nome,
          (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
        FROM importados_zurich IZ
            left join selects S ON S.sel_id = IZ.status 
        WHERE IZ.id_emp IN (113	)
          AND IZ.gatilho = 0
          AND IZ.status = 53
        GROUP BY IZ.id`,
      tipoQuery: { type: Sequelize.SELECT },
    });

    return response[0];
  }

  async enviaOs(browser) {
      console.log("enviou os dados");
  
      var content = JSON.parse(fs.readFileSync("dadosfora.json"));
      await teste.loopEnvia(content, browser);
   }

  // async carregaOS(){
  //     var response = await axios
  //         .post('https://gsplanaltec.com/consultaBot/', {
  //           sqlQuery: `SELECT
  //           IZ.id,
  //           IZ.OS,
  //           IZ.prod_recolhido,
  //           IZ.Sinistro,
  //           IZ.data,
  //           @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
  //           IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
  //           IZ.status,
  //           S.sel_nome,
  //           (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
  //         FROM importados_zurich IZ
  //             left join selects S ON S.sel_id = IZ.status
  //         WHERE IZ.id_emp IN (101)
  //           AND IZ.gatilho = 0

  //           AND IZ.status = 69

  //         GROUP BY IZ.id`
  //         },
  //         {  //AND IZ.OS = '3713772'
  //           headers:{
  //             'Content-Type' : 'application/json; charset=UTF-8',
  //           }
  //         }).then(function(response) {
  //             console.log(response)
  //           return response.data;
  //         }).catch(function (error) {
  //           console.error(error);
  //         });

  //     return response;
  //   }
  removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }
  async updateGatilhoSinistros(id) {
    axios
      .post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `UPDATE importados_zurich SET gatilho = 1 WHERE id IN (${id})`,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      )
      .then(function (response) {
        var retorno = response.data;
        console.log(retorno);
      })
      .catch(function (error) {
        console.error(error);
      });
  }
  reset() {
    setTimeout(teste.logando, 60000);
    console.log("reset");
  }

  strFrequency(stringArr) {
    return stringArr.reduce((count, word) => {
      count[word] = (count[word] || 0) + 1;
      return count;
    }, {});
  }

  async tomaOK(page) {
    page.on("dialog", async (dialog) => {
      //get alert message
      console.log(dialog.message());
      //accept alert
      await dialog.accept();
    });
  }
}

const teste = new Vinculacao();
teste.logando();
