/*** Globals ***/
let model, view;
var controller;  //This uses var because controller needs to be available globally so that Google Maps can access it as its callback

/*** Model ***/
class Model {
  constructor() {
    this._arrRestaurants = [];
    this._arrCuisineOptions = [];
    this._arrNeighborhoodOptions = [];
  }

  /*
   * Arguments:
   * restaurants = array of Restaurant objects, obtained from network or database via the Controller
  */
  addFetchedRestaurants(restaurants) {
    this._arrRestaurants = restaurants;
  }

  /*
   * The View expects each restaurant to have an imgUrl and url property, so create those here
   */
  addUrlsToRestaurants() {
    this._arrRestaurants.map(function(element) {
      element.imgUrl = `/img/${element.photograph}`;
      element.url = `./restaurant.html?id=${element.id}`;
    });
  }

  /*
   * Arguments:
   * propertyName = the property in the Restaurant object that corresponds to the desired select filter,
   * so 'cuisine_type' or 'neighborhood'
   */
  setArrOptions(propertyName) {
    // Get the different values of the property from all restaurants
    const arrValues = this._arrRestaurants.map((obj) => obj[propertyName]);
    // Remove duplicates from the array
    const uniqueValues = arrValues.filter((value, index) => arrValues.indexOf(value) == index);
    
    if (propertyName === 'neighborhood') {
      this._arrNeighborhoodOptions = uniqueValues;
    }
    else {
      this._arrCuisineOptions = uniqueValues;
    }
  }

  getRestaurantsByCuisineAndNeighborhood(cuisine, neighborhood) {
    let restaurants = this._arrRestaurants;
    if (cuisine != 'all') {  //then filter by cuisine
      restaurants = restaurants.filter(r => r.cuisine_type == cuisine);
    }
    if (neighborhood != 'all') {  //then filter by neighborhood
      restaurants = restaurants.filter(r => r.neighborhood == neighborhood);
    }

    return restaurants;
  }

  getNeighborhoodOptions() {
    return this._arrNeighborhoodOptions;
  }

  getCuisineOptions() {
    return this._arrCuisineOptions;
  }
}

  /*** Restaurant Object
    id : int
    name: string
    neighborhood: string
    photograph: string "#.jpg"
    address: string
    latling: obj {lat: float, lng: float}
    cuisine_type: string
    operating_hours: obj {Monday: string, Tuesday: string, ..., Sunday: string}
    reviews: array of review objects
          review: obj {name: string, date: string, rating: int, comments: string}

    Model adds:
    imgUrl: string
    url: string  (url of the individual restaurant's page)
  ***/

/*** View ***/
class View {
  constructor() {
    /*** HTML Elements ***/
    /*** Select Fields ***/
    this._neighborhoodSelect = document.getElementById('neighborhoods-select');
    this._cuisineSelect = document.getElementById('cuisines-select');
    /*** Restaurant Entries in Flexbox ***/
    this._restaurantsList = document.getElementById('restaurants-list');
    /*** Google Map ***/
    this._map = '';
    this._mapDiv = document.getElementById('map');
    this._mapMarkers = [];
    this._isMapDisplayed = false;
    this._showMapBtn = document.getElementById('show-map');

    this._displayedRestaurants = [];  //which restaurants are currently displayed
  }

  /*** Select Field Related ***/

  /*controller will call this function, passing in the data returned from the model:*/
  /*
   * Arguments:
   * selectField = which field to fill (view._neighborhoodSelect or view._cuisineSelect)
   * entries = which options to include (from model's neighborhood or cuisine data)
   */
  fillSelectField(selectField, entries) {
    entries.forEach(function(entry) {
      const option = document.createElement('option');
      option.innerHTML = entry;
      option.value = entry;
      selectField.append(option);
    });
  }

  getSelectedNeighborhood() {
    const index = this._neighborhoodSelect.selectedIndex;
    return this._neighborhoodSelect[index].value;
  }

  getSelectedCuisine() {
    const index = this._cuisineSelect.selectedIndex;
    return this._cuisineSelect[index].value;
  }

  /*** Restaurant Entry Related ***/

  /*
   * Arguments: 
   * restaurant = the individual restaurant to create HTML for
   */
  createRestaurantHTML(restaurant) {
    const li = document.createElement('li');

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    let strName = restaurant.imgUrl;
    strName = strName.replace('/img/', '').replace('.jpg', '');
    strName = '/img/' + strName + '-2x.jpg';
    image.src = strName;
    //image.srcset = strName + ' 2x';  //serviceworker renders this pointless
    image.alt = restaurant.name;
    li.append(image);

    const name = document.createElement('h3');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const div_container = document.createElement('div');
    li.append(div_container);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = restaurant.url;
    more.setAttribute('aria-label', 'View details about ' + restaurant.name);
    div_container.append(more);

    return li;
  }

  /*
   * Arguments: 
   * restaurants = array of the specific restaurants to display
   */
  setDisplayedRestaurants(restaurants) {
    this._displayedRestaurants = restaurants;
  }

  updateDisplayedRestaurants() {
    //First clear what is already there
    this._restaurantsList.innerHTML = '';

    this._displayedRestaurants.forEach(function(restaurant) {
      this._restaurantsList.append(this.createRestaurantHTML(restaurant));
    }, this);
  }

  /*** Google Map Related ***/

  initMap() {
    const self = this;
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    self._map = new google.maps.Map(self._mapDiv, {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
    self._mapDiv.setAttribute("style","height:400px");
    self._isMapDisplayed = true;
  }

  createMapMarker(restaurant) {

    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: restaurant.url,
      map: this._map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  addMarkersToMap() {
    const self = this;
    self._displayedRestaurants.forEach(function(restaurant) {
      const marker = self.createMapMarker(restaurant);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url
      });
      self._mapMarkers.push(marker);
    });
  }

  updateDisplayedMapMarkers() {
    const arrDisplayedRestaurantNames = this._displayedRestaurants.map(restaurant => restaurant.name);

    this._mapMarkers.forEach(function(marker) {
      if (arrDisplayedRestaurantNames.includes(marker.title)) {
        marker.setVisible(true);
      }
      else {
        marker.setVisible(false);
      }
    });
  }

  getIsMapDisplayed() {
    return this._isMapDisplayed;
  }

  enableButton() {
    this._showMapBtn.innerText = "Show Google Maps";
    this._showMapBtn.disabled = false;
  }

  showMap() {
    this.initMap();
    this.addMarkersToMap();
    document.getElementById('map-button-div').style.display="none";
    this._showMapBtn.disabled = true;
  }
}

/*** Controller ***/
class Controller {
  constructor() {
    /*** For IndexedDB ***/
    this._DB_NAME = 'db-restaurant-reviews';
    this._DB_VER = 1;
    this._DB_OBJ_STORE = 'restaurants';
    this._DATABASE_SERVER_PORT = 1337;
    this._DATABASE_URL = `http://localhost:${this._DATABASE_SERVER_PORT}/`;
    this._dbPromise = this.openDatabase();

    /*** For Google Maps ***/
    this._MAX_READYFORMAP_CALLS = 2;
    this._numReadyForMapCalls= 0;
  }

  /*** IndexedDB Related ***/

  openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve();

    self = this;

    return idb.open(self._DB_NAME, self._DB_VER, function(upgradeDb) {
      upgradeDb.createObjectStore(self._DB_OBJ_STORE, {
        keyPath: 'id'
      });
    });
  }

  saveToDatabase(db, json) {
    let tx = db.transaction(this._DB_OBJ_STORE, 'readwrite');
    let store = tx.objectStore(this._DB_OBJ_STORE);
    json.forEach(function(restaurant) {
      store.put(restaurant);
    });
  }

  fetchRestaurantData() {
    self = this;

    //First, check the database
    return self._dbPromise.then(function(db) {
      let store = db.transaction(self._DB_OBJ_STORE).objectStore(self._DB_OBJ_STORE);
      return store.getAll().then(function(arrRestaurants) {
        if (arrRestaurants.length === 0) {  //no data in the database, so fetch from network (and save to database)
          return fetch(self._DATABASE_URL + 'restaurants').then(function(response) {
            console.log('requesting json from server');
            if (response.status === 200) {
              return response.json().then(function(json) {  //store data in the database and return it to what asked for it
                self.saveToDatabase(db, json);
                return json;
              });
            }
          }).catch(function(err) {
            console.log('This error in going to network in fetchNetworkJSON: ' + err);
          });
        }
        else { //already have the data so just return the array of restaurants from the database
          console.log('Returning data from database.');
          return arrRestaurants;
        }
      });
    });
  }

  /*
   * I only want the Google Map to display (and have markers added) if and after:
   *  1.  The Google Map callback has fired (calling controller.mapCallback)
   *  2.  The JSON data to fill the Model has been fetched
   *
   * The only successful solution I've been able to implement is having both of these events trigger a callback,
   * counting the number of times it's happened, and then once the target has been hit, actually doing everything
   * with the map.  Via https://stackoverflow.com/questions/9156611/how-do-i-execute-something-after-all-the-callbacks-are-finished-in-javascript
   */
  readyForMap() {
    this._numReadyForMapCalls++;

    if (this._numReadyForMapCalls === this._MAX_READYFORMAP_CALLS) {
      /* Now handled in button
      view.initMap();
      view.addMarkersToMap();
      */
      view.enableButton();
    }
  }

  updateDisplayedRestaurants() {
    view.setDisplayedRestaurants(model.getRestaurantsByCuisineAndNeighborhood(view.getSelectedCuisine(), view.getSelectedNeighborhood()));
    view.updateDisplayedRestaurants();

    if (view.getIsMapDisplayed()) {
      view.updateDisplayedMapMarkers();
    }
  }

  registerServiceWorker() {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  }


//controller:
//open the database
//fetch all the JSON data (either from database or network), give to model
    //service worker and have it start caching data  (unless, would waiting to do this later speed up initial page load?)
//add new properties to each restaurant in the model
//obtain the data for the select fields
  //all data now obtained
//fill select fields
//get filtered restaurants from the model with data from view's getSelectedOption(selectField), pass to view's setDisplayedRestaurants
//handle map stuff, adding markers
  loadSite() {
    const self = this;
    self.fetchRestaurantData().then(function(json) {
      /*** Model Related ***/
      model.addFetchedRestaurants(json);
      model.addUrlsToRestaurants();
      model.setArrOptions('neighborhood');
      model.setArrOptions('cuisine_type');

      /*** View Related ***/
      view.fillSelectField(view._neighborhoodSelect, model.getNeighborhoodOptions());
      view.fillSelectField(view._cuisineSelect, model.getCuisineOptions());
      self.updateDisplayedRestaurants();

      self.readyForMap();
    });
  }
}

//add some more comments to code

//removing the map = performance rating of 92.

//Map needs to be moved to bottom of screen, especially for mobile (and then don't draw it until in view)
//But would that really fix it?  The map is just SO SLOW.  I think you'll have to have a button / ask the user
//if they want to view a map.  Otherwise, it's just going to load way too slowly.

//I don't think you have to cache much early on now, just the index.html?  Once you get the JSON, then fetch requests are made for the images
//**but the issue is that the service worker doesn't exist on the first install, right?  
//so it can only prevent network fetch requests later on and NOT intercept the first ones...
//will clients.claim() help in the activate event?
  //^Nope.  Serviceworker is just too slow.  I can't believe there's no way to NOT download the most giant-sized pictures... too bad.

//Huh, the project notes make it seem like IndexedDB should go through the serviceworker...?
//https://developers.google.com/web/ilt/pwa/live-data-in-the-service-worker
//That makes no sense.  How can you "be able to visit any page you've seen" when the serviceworker doesn't take effect until
//a 2nd visit?


/*** Load the Page ***/

document.addEventListener('DOMContentLoaded', function(event) {
  model = new Model();
  view = new View();
  controller = new Controller();

  controller.registerServiceWorker();  
  controller.loadSite();
});