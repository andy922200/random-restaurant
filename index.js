const LOC_URL = 'http://www.geoplugin.net/json.gp'
const mapLOC = document.querySelector('#map')
const ipInfo = document.querySelector('#ipInfo')
const dataPanel = document.querySelector('#panel')
const paginationLocal = document.querySelector('#pagination')
const search = document.querySelector('#search')
const more = document.querySelector('#more')
const ITEM_PER_PAGE = 6
const radius = 1500
let paginationData = []

//取得IP位置
function getGPS() {
  let result = { latitude: 0, longitude: 0 }
  return new Promise((resolve, reject) => {
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 180000, //最多保留3分鐘
    }
    //取得GPS定位
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options)
    } else {
      console.log("您的瀏覽器不支援GPS定位")
    }
    function successCallback(position) {
      result.latitude = position.coords.latitude
      result.longitude = position.coords.longitude
      resolve(result)
    }
    function errorCallback(error) {
      console.log(error) // PositionError {code: 1, message: "User denied Geolocation"}
    }
  })
}

// 取得IP對應實體位置和貨幣資料
function getCurrency_and_Place() {
  let result = { IP: '', defaultCurrency: '', yourCountry: '', region: '' }
  return new Promise((resolve, reject) => {
    axios
      .get(LOC_URL)
      .then(location => {
        result.IP = location.data.geoplugin_request
        result.defaultCurrency = location.data.geoplugin_currencyCode
        result.yourCountry = location.data.geoplugin_countryName
        result.region = location.data.geoplugin_regionName
        resolve(result)
      })
      .catch((error) => console.log(error))
  })
}

/*顯示IP Address & 所在地區*/
function displayIP(yourCountry, region, IP, defaultCurrency) {
  let IPHtmlContent = ''
  let countryHtmlContent = ''
  if (region !== undefined) {
    IPHtmlContent = `
      <span>您的IP位置是 ${IP}</span>
    `
    ipInfo.innerHTML += IPHtmlContent
    if (defaultCurrency !== null) {
      countryHtmlContent = `
      <p>您在：${region}, ${yourCountry}</p>
      <p>貨幣單位為：${defaultCurrency}</p>
    `
    } else {
      countryHtmlContent = `
      <p>您在： ${region}, ${yourCountry}</p>
      <p>貨幣單位為：USD</p>
    `
    }
    ipInfo.innerHTML += countryHtmlContent
  } else {
    ipInfo.innerHTML = '' //若無完整資料，寫入空白資料
  }
}

//產生Google地圖取得餐廳資料,記得要載入Google api Library 
function initMap(latitude, longitude, radius) {
  // Initial position
  if ((latitude === undefined) || (longitude === undefined)) {
    mapLOC.innerHTML = `<span>Waiting......</span>`
  } else {
    let initialPosition = new google.maps.LatLng(latitude, longitude)
    // to create the map
    let map = new google.maps.Map(document.getElementById('map'), {
      center: initialPosition,
      zoom: 13
    });
    // the request for nearbySearch()
    let request = {
      location: initialPosition,
      radius: 1500,
      types: ['bakery', 'cafe', 'supermarket', 'restaurant'],
    };
    // to do the nearbySearch() request to found types around the initial position
    let service = new google.maps.places.PlacesService(map)
    service.nearbySearch(request, NearbySearchCallback)
  }
}

// This function is called when nearbySearch() has done
function NearbySearchCallback(results, status, pagination) {
  getTotalPages(results)
  getPageData(1, results)
  //search 監聽器
  search.addEventListener('click', event => {
    event.preventDefault()
    let input = searchInput.value
    let chosenPlaces = []
    const regex = new RegExp(input, 'i')
    chosenPlaces = results.filter(place => place.name.match(regex))
    getTotalPages(chosenPlaces)
    getPageData(1, chosenPlaces)
    //有時間差問題，所以按下後不清空輸入值
  })
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    //more 監聽器
    more.addEventListener('click', event => {
      event.preventDefault()
      if (pagination.hasNextPage) {
        sleep: 2;
        pagination.nextPage()
      } else {
        more.disabled = true
      }
    })
  }
}

//計算總共頁數
function getTotalPages(results) {
  let totalPages = Math.ceil(results.length / ITEM_PER_PAGE) || 1
  let pageItemContent = ''
  for (let i = 0; i < totalPages; i++) {
    pageItemContent += `
        <li class="page-item">
          <a class="page-link" href="javascript:;" data-page="${i + 1}">${i + 1}</a>
        </li>
      `
  }
  pagination.innerHTML = pageItemContent
}

//pagination 監聽器
paginationLocal.addEventListener('click', event => {
  event.preventDefault()
  if (event.target.tagName === 'A') {
    getPageData(event.target.dataset.page)
  }
})

//篩選出指定頁面的資料並顯示
function getPageData(pageNum, results) {
  dataPanel.innerHTML = '' //記得先清空現有內容
  paginationData = results || paginationData
  let offset = (pageNum - 1) * ITEM_PER_PAGE
  let pageData = paginationData.slice(offset, offset + ITEM_PER_PAGE)
  let htmlContent = ''
  if (paginationData.length === 0) {
    dataPanel.innerHTML = `
      <h3>無資料 QaQ</h3>
    `
  }
  for (let i = 0; i < pageData.length; i++) {
    if (!pageData[i].photos || !pageData[i].opening_hours) {
      delete pageData[i]
    }
    if (pageData[i] !== undefined) {
      htmlContent += `
      <div class="card col-sm-4" style="width: 18rem;">
        <img class="card-img-top" src="${pageData[i].icon}" alt="restaurantImage">
        <div class="card-body">
          <h5 class="card-title">${pageData[i].name}</h5>
      `
      htmlContent += `
          <p class="card-text">${pageData[i].photos[0].html_attributions[0]} </p>
          <p class="card-text">提供相片</p>
      `
      for (let j = 0; j < pageData[i].types.length; j++) {
        htmlContent += `
        <span class="badge badge-info">${pageData[i].types[j]}</span>
      `
      }
      htmlContent += `      
      </div>
        <!--Button trigger modal-->
          <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#${pageData[i].reference}">詳細資訊</button>
        <!--Modal-->
          <div class="modal fade" id=${pageData[i].reference} tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="exampleModalLabel">${pageData[i].name}</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <h6>評價 ${pageData[i].rating} / 5 ，共 ${pageData[i].user_ratings_total} 位網友意見</h6>
                  <p>地址：${pageData[i].vicinity}</p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-warning" data-dismiss="modal">Close</button>
                </div>
              </div>
            </div>
          </div>
      </div>
    `
    }
  }
  dataPanel.innerHTML += htmlContent
}

(async () => {
  try {
    let place = await getCurrency_and_Place()
    let gpsData = await getGPS()
    displayIP(place.yourCountry, place.region, place.IP, place.defaultCurrency)
    initMap(gpsData.latitude, gpsData.longitude, radius)
  } catch (err) {
    console.log(err)
  }
})()