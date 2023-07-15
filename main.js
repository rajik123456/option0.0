// Method to make HTTP GET requests
function getData(url) {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.status);
                }
            }
        };
        xhr.send();
    });
}

// Method to get nearest strikes
function roundNearest(x, num = 50) {
    return Math.ceil(parseFloat(x) / num) * num;
}

function nearestStrikeBNF(x) {
    return roundNearest(x, 100);
}

function nearestStrikeNF(x) {
    return roundNearest(x, 50);
}

// Variables
let bnfUL;
let nfUL;
let bnfNearest;
let nfNearest;

// URLs for fetching data
const urlOC = "https://www.nseindia.com/option-chain";
const urlBNF = 'https://www.nseindia.com/api/option-chain-indices?symbol=BANKNIFTY';
const urlNF = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
const urlIndices = "https://www.nseindia.com/api/allIndices";

function setHeader() {
    return new Promise(function(resolve, reject) {
        getData(urlIndices)
            .then(function(responseText) {
                const data = JSON.parse(responseText);
                data.data.forEach(function(index) {
                    if (index.index === "NIFTY 50") {
                        nfUL = index.last;
                    }
                    if (index.index === "NIFTY BANK") {
                        bnfUL = index.last;
                    }
                });
                bnfNearest = nearestStrikeBNF(bnfUL);
                nfNearest = nearestStrikeNF(nfUL);
                resolve();
            })
            .catch(function(error) {
                reject(error);
            });
    });
}

// Current price of Nifty
function getPrice(url) {
    return new Promise(function(resolve, reject) {
        getData(url)
            .then(function(responseText) {
                const data = JSON.parse(responseText);
                const currExpiryDate = data.records.expiryDates[0];
                let price = null;

                data.records.data.forEach(function(item) {
                    if (item.expiryDate === currExpiryDate && item.strikePrice === nfNearest) {
                        price = item.CE.underlyingValue;
                    }
                });

                resolve(price);
            })
            .catch(function(error) {
                reject(error);
            });
    });
}

// Fetching CE and PE data based on Nearest Expiry Date
function getOptionChainData(num, step, nearest, url) {
    return new Promise(function(resolve, reject) {
        getData(url)
            .then(function(responseText) {
                const data = JSON.parse(responseText);
                const currExpiryDate = data.records.expiryDates[0];
                const optionChainData = [];

                data.records.data.forEach(function(item) {
                    if (item.expiryDate === currExpiryDate && item.strikePrice >= nearest - (step * num) && item.strikePrice < nearest + (step * num)) {
                        optionChainData.push({
                            Change_CE_OI: item.CE.changeinOpenInterest,
                            ask_price: item.CE.askPrice,
                            CE_Open_Intrest: item.CE.openInterest,
                            StrikePrice: item.strikePrice,
                            PE_Open_Intrest: item.PE.openInterest,
                            Ask_price: item.PE.askPrice,
                            Change_PE_OI: item.PE.changeinOpenInterest
                        });
                    }
                });

                resolve(optionChainData);
            })
            .catch(function(error) {
                reject(error);
            });
    });
}

function calculateOpenInterest(optionChainData) {
    const ceOpenInterest = optionChainData.reduce(function(total, item) {
        return total + item.CE_Open_Intrest;
    }, 0);
    
    const peOpenInterest = optionChainData.reduce(function(total, item) {
        return total + item.PE_Open_Intrest;
    }, 0);
    
    return ceOpenInterest - peOpenInterest;
}

// Entry point
// Entry point
function fetchData() {
    const num = 10;
    const step = 50;

    setHeader()
        .then(function() {
            return getOptionChainData(num, step, nfNearest, urlNF);
        })
        .then(function(optionChainData) {
            const df = optionChainData;
            const openInterest = calculateOpenInterest(optionChainData);

            const tableHeaders = Object.keys(df[0]);
            let tableContent = '';

            // Generate table header
            tableContent += '<tr>';
            for (let header of tableHeaders) {
                tableContent += `<th>${header}</th>`;
            }
            tableContent += '</tr>';

            // Generate table rows
            for (let row of df) {
                tableContent += '<tr>';
                for (let header of tableHeaders) {
                    tableContent += `<td>${row[header]}</td>`;
                }
                tableContent += '</tr>';
            }

            const output = `
                <table>
                    ${tableContent}
                </table>
                <p>CE Open Interest: ${openInterest}</p>
            `;

            document.getElementById("data-container").innerHTML = output;
        })
        .catch(function(error) {
            console.error("Error:", error);
        });
}

fetchData();
