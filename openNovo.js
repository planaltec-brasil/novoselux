const fs = require("fs");
const puppeteer = require("puppeteer");
const axios = require("axios");
const Sequelize = require("sequelize");
var posts = [];
const { format, addDays } = require("date-fns");
const moment = require("moment");
const clipboardy = require("node-clipboardy");

var iDados = 0;
let dados = [];
let json = {};

class Vinculacao {
  acaoModel = require("../../../acaoModel/acaoModel");
  constructor() {
    this.acaoModel = new this.acaoModel();
  }

  async logando(i = 0, arr = []) {
    const browser = await puppeteer.launch({
      headless: false,
    });

    console.log("login");
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
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

    // teste.tomaOK(page);
    await page.waitForTimeout(5000);
    // posts = arr.length > 0 ? arr : await teste.carregaOS();
    await teste.listagem(page, browser, i);
    return;
  }

  async listagem(page, browser, i = 0) {
    try {
      //Ordens de Serviço
      await page.waitForSelector(
        "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
      );
      await page.click(
        "body > app-root > app-portal > app-header > app-menu > div.row.header-navigation > div > div.d-none.d-md-flex.container.align-items-center.nav-container > div.d-flex.flex-grow-1.justify-content-evenly > div:nth-child(3)"
      );
      await page.waitForTimeout(6000);

      // Clique para abrir o dropdown
      await page.click("input.selected-option");

      // Espera o dropdown aparecer
      await page.waitForSelector("ul.dropdown-list");

      // Encontre o checkbox da opção "Open" e marque-o
      await page.evaluate(() => {
        // Encontre o elemento li que contém a opção "Open"
        const openOption = [
          ...document.querySelectorAll("ul.dropdown-list li"),
        ].find((li) => li.textContent.includes("Open"));

        if (openOption) {
          // Encontre o checkbox dentro dessa li e marque-o
          const checkbox = openOption.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.click();
          }
        }
      });

      //Buscar
      await page.waitForTimeout(2000);
      await page.click(
        "#main-content > app-service-order-list > div > div.row.mt-3.no-print > div:nth-child(4) > lib-elux-button > button > div:nth-child(2)"
      );
      await page.waitForTimeout(8000);

      //Entra no sinistro
      await page.click(
        "#main-content > app-service-order-list > div > div:nth-child(8) > div > lib-elux-datatable > div > div:nth-child(2) > div:nth-child(1) > a"
      );

      //le o numero do sinistro
      await page.waitForSelector("#main-content > ng-component > div > div.row.mt-5.mb-2 > div > span.subtitle.mb-2")
      await page.waitForTimeout(3000);
      let Sinistro = await page.$$eval("#main-content > ng-component > div > div.row.mt-5.mb-2 > div > span.subtitle.mb-2", (elements) => elements.map((el) => el.innerText))
      Sinistro = Sinistro[0]
      console.log(Sinistro)
      const verificacao = await teste.carregaOS(Sinistro);
      // console.log(verificacao);
      // console.log(verificacao.length)
      // if(verificacao.length == 0){
      //   console.log("Sinistro não existe.");
      //   await page.waitForTimeout(4000);
      //   teste.listagem(page, browser, ++i);
      //   return;
      // }

     
      
      console.log(verificacao[0]?.status); // Optional chaining para evitar erros
      if (verificacao[0]?.status == 50) {
        console.log("Esta em cancelado, alterando para o status 5")
        let id = verificacao[0]?.id
        const dataFormatada = moment().format("DD/MM/YYYY"); // Formata a data no formato desejado
        const horaAtual = moment().format("HH:mm"); // Formatação da hora
        await teste.updateStatusSinistros(id, dataFormatada, horaAtual);
        await teste.updateAtivoInativo(id);
        await page.waitForTimeout(1000);
      }

      //Editar
      await page.waitForTimeout(2000);
      await page.click(
        "#main-content > ng-component > div > div:nth-child(4) > div.row.mt-5.mb-2 > div:nth-child(1) > lib-elux-button > button"
      );

      await page.waitForTimeout(4000);
      // Clique para abrir o dropdown de status
      await page.click(
        "#main-content > app-service-order-edit > div > div:nth-child(3) > form:nth-child(2) > div:nth-child(4) > div > lib-elux-dropdown > div > input"
      );

      // Aguarde o dropdown carregar
      await page.waitForSelector("ul.dropdown-list");

      // Selecione a opção "Sem contato com o consumidor"
      const option = await page.$("ul.dropdown-list li:nth-child(39)");
      await option.click();
      // Aguarde a ação ser completada ou realizar outras ações que desejar
      await page.waitForTimeout(2000); // Tempo para observar
      await page.waitForTimeout(5000);

      //Salvar
      await page.click(
        "#main-content > app-service-order-edit > div > div.row.mt-5 > div.col-3.ms-auto > lib-elux-button > button"
      );
      await page.waitForTimeout(4000);
      teste.listagem(page, browser, ++i);
      return;
    } catch (error) {
      console.log(error);
      teste.reset();
      if(browser){
        browser.close();
      }
      return;
    }
  }
//   async carregaOS() {
//     const response = await this.acaoModel.manualQuery({
//       bd: "servico_bd",
//       tabela: "importados_zurich",
//       query: `SELECT 
//     IZ.id,
//     IZ.OS,
//     IZ.Sinistro,
//     IZ.data,
//     @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
//     IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
//     IZ.status,
//     S.sel_nome,
//     (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao',
//     IZ.cod_subconjunto,
//     IZ.cod_defeito,
//     IZ.orientacao_consumidor,
//     IZ.pnc_ml_electrolux,
//     IZ.modelo_comercial,
//     IZ.numero_nf,
//     IZ.numero_serie,
//     IZ.tensao,
//     IZ.revendedor,
//     IZ.modelo_usual,
//     IZ.data_nf,
//     IZ.taxa_flet  -- Adicionando o campo taxa_flet
// FROM importados_zurich IZ
//     LEFT JOIN selects S ON S.sel_id = IZ.status 
// WHERE IZ.id_emp IN (101, 113, 144)
//   AND IZ.reincidencia != 4
//   AND taxa_flet = 0
//   AND IZ.status IN (97, 18, 72, 71, 78, 79)
//   AND NOT (
//       (IZ.modelo_comercial IS NULL OR TRIM(IZ.modelo_comercial) = '') AND
//       (IZ.pnc_ml_electrolux IS NULL OR TRIM(IZ.pnc_ml_electrolux) = '') AND
//       (IZ.numero_serie IS NULL OR TRIM(IZ.numero_serie) = '') AND
//       (IZ.tensao IS NULL OR TRIM(IZ.tensao) = '') AND
//       (IZ.revendedor IS NULL OR TRIM(IZ.revendedor) = '') AND
//       (IZ.modelo_usual IS NULL OR TRIM(IZ.modelo_usual) = '')
//   )
// GROUP BY IZ.id;
// `,
//       tipoQuery: { type: Sequelize.SELECT },
//     });

//     return response[0];
//   }

  // async carregaOS() {
  //   var response = await axios
  //     .post(
  //       "https://gsplanaltec.com/consultaBot/",
  //       {
  //         sqlQuery: `SELECT
  //             IZ.id,
  //             IZ.OS,
  //             IZ.Sinistro,
  //             IZ.data,
  //             @varAG := (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id AND (A.status_id = IZ.status) ORDER BY A.A_id DESC limit 1) as varAG,
  //             IF(@varAG IS NULL, (SELECT A.A_Data FROM agendamento A WHERE A.A_id_Zurich = IZ.id ORDER BY A.A_id DESC limit 1), @varAG) as AG,
  //             IZ.status,
  //             S.sel_nome,
  //             (SELECT D.desc_descricao FROM descricoes D where D.desc_id_zurich = IZ.id AND D.desc_descricao LIKE CONCAT('%', S.sel_nome, '%') order by D.desc_id desc limit 1) as 'descricao'
  //           FROM importados_zurich IZ
  //               left join selects S ON S.sel_id = IZ.status
  //           WHERE IZ.id_emp IN (101)
  //             AND IZ.gatilho = 0
  //             AND IZ.status = 53

  //           GROUP BY IZ.id`,
  //       },
  //       {
  //         //AND IZ.OS = '3713772'
  //         headers: {
  //           "Content-Type": "application/json; charset=UTF-8",
  //         },
  //       }
  //     )
  //     .then(function (response) {
  //       console.log(response);
  //       return response.data;
  //     })
  //     .catch(function (error) {
  //       console.error(error);
  //     });

  //   return response;
  // }

  async updateStatusSinistros(id, dataFormatada, horaAtual) {
    const descricao = `Mudanças de: Suporte - Status Atualizado de 'Cancelado' para 'Não Enviado' | `;
    try {
      // Atualiza o status
      await axios.post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `
              UPDATE importados_zurich SET status = 5 WHERE id IN (${id});
            `,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );
      console.log("Status atualizado com sucesso");

      // Inserir a descrição após o update
      await axios.post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `
              INSERT INTO descricoes (desc_id_zurich, desc_descricao, desc_data, desc_hora)
              VALUES (${id}, "${descricao}", "${dataFormatada}", "${horaAtual}");
            `,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
        }
      );
      console.log("Descrição inserida com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar status e inserir descrição:", error);
    }
  }

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

   async updateAtivoInativo(id) {
      axios
        .post(
          "https://gsplanaltec.com/consultaBot/",
          {
            sqlQuery: `UPDATE importados_zurich SET AtivoInativo = 1 WHERE id IN (${id})`,
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
    
  async updateGatilhoSinistros(id) {
    axios
      .post(
        "https://gsplanaltec.com/consultaBot/",
        {
          sqlQuery: `UPDATE importados_zurich SET taxa_flet = 1 WHERE id IN (${id})`,
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
    setTimeout(teste.logando, 600000);
    console.log("reset");
  }

  async carregaOS(Sinistro) {
    const response = await this.acaoModel.manualQuery({
      bd: "servico_bd",
      tabela: "importados_zurich",
      query: `SELECT status, id From importados_zurich WHERE Sinistro = "${Sinistro}"`,
      tipoQuery: { type: Sequelize.SELECT },
    });
    return response[0];
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
