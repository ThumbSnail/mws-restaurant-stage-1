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

    /*** For Google Maps ***/
    this._MAX_READYFORMAP_CALLS = 2;
    this._numReadyForMapCalls= 0;
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
      view.initMap();
      view.addMarkersToMap();
    }
  }


  // !!! I wish there was a way to have separate DB and network functions.
  //  If database already exists and has stuff in it, skip the network
  //  If database doesn't exist, skip that entirely and head straight to the network

  //just test out the network response for now to make sure this code reconstruction is successful
  fetchNetworkJSON() {
    return fetch(this._DATABASE_URL + 'restaurants').then(function(response) {
      console.log('requesting json from server');
      if (response.status === 200) {
        return response.json();  //a promise that resolves to the actual JSON
      }
    }).catch(function(err) {
      console.log('This error in going to network in fetchNetworkJSON: ' + err);
    });
  }

  updateDisplayedRestaurants() {
    view.setDisplayedRestaurants(model.getRestaurantsByCuisineAndNeighborhood(view.getSelectedCuisine(), view.getSelectedNeighborhood()));
    view.updateDisplayedRestaurants();

    if (view.getIsMapDisplayed()) {
      view.updateDisplayedMapMarkers();
    }
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
    self.fetchNetworkJSON().then(function(json) {
      /*** Model Related ***/
      model.addFetchedRestaurants(json);
      model.addUrlsToRestaurants();
      model.setArrOptions('neighborhood');
      model.setArrOptions('cuisine_type');

      /*** View Related ***/
      view.fillSelectField(view._neighborhoodSelect, model.getNeighborhoodOptions());
      view.fillSelectField(view._cuisineSelect, model.getCuisineOptions());
      self.updateDisplayedRestaurants();

      //This works when loading google maps synchronously...  but that obviously slows down the page load.
      /*
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAyrqBHpWngKKtzAfAtlR1Bivdlnj-wTZc&libraries=places"></script>
  <script type="application/javascript" charset="utf-8" src="js/allMain.js"></script>
      */
      //view.initMap();
      //view.addMarkersToMap();

      self.readyForMap();
    });
  }
}

//I think you still need some kind of boolean that the map is loaded
//that's because controller.updateDisplayedRestaurants needs to know whether or not to add map markers (when people filter via HTML)

/*How to make map load faster...
have an initMap function that makes a promise that resolves upon being called?  
Still don't like how the initMap function isn't called when Google maps doesn't load; would be better to catch that error elsewhere
  ^you can do this synchronously:  if (!google) then no map
there's a google map promises library:  https://www.npmjs.com/package/google-maps-promise
DON'T auto load it and instead ask for user input before displaying a map (that would certainly help the load time on mobile)


Actually, it no longer matters if the map loads or not.  The map's default state is hidden.  And I already load the page content
regardless of the map.  Thus, if the map fails, I don't care.
So I just need a promise that resolves when initMap is called

*/


/*** Initial Setup ***/

// !!!!! Yeah, could this be changed to make it better/faster?
// Start fetching the data immediately (even before the DOM loads)
// can you open the database right away?
// when can you start caching via the Cache API?
// so, make a model and a controller rightaway
// view needs to wait until the DOM exists (is that what DOMContentLoaded is, or does that wait even longer)
// service worker seems to need to be later, but is that correct?
document.addEventListener('DOMContentLoaded', function(event) {
  model = new Model();
  view = new View();
  controller = new Controller();

  controller.loadSite();
});

//commenting out for now (hopefully):
commentedOut = `


//possible controller stuff:
/* With internet connection, when Google Maps loads, its init event triggers loading page content (since
 * the map requires some of the restaurant data).  However, without internet, no content would display since
 * Google Maps doesn't call its init function in that case.  The service worker is set up to detect that 
 * failed fetch event and then message the client.  But... sometimes the client's listener doesn't load 
 * fast enough to receive that message.  So this boolean is part of a backup plan to still display content
 * in that situation.
 */
let isContentLoaded = false;  //set true in updateRestaurants()
let isMapLoaded = false;  //used to determine if a map exists and thus should have markers placed on it

/**
 * Set up the service worker
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/sw.js').then(function(registration) {
    console.log('ServiceWorker registration successful with scope: ', registration.scope);
  }, function(err) {
    console.log('ServiceWorker registration failed: ', err);
  });

  //for receiving a message from the service worker that google maps didn't load (when offline):
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.msg == 'Google Maps failed') {
      console.log('Received msg from serviceworker: ' + event.data.msg);
      if (isContentLoaded) return;
      updateRestaurants();
    }
  });

  fetchNeighborhoods();
  fetchCuisines();

  //sometimes the service worker posts its message before the client is ready to receive
  //in that case, include this as a failsafe so that the list of restaurants automatically appears when offline
  setTimeout(function() {
    if (isContentLoaded) return;

    console.log('backup timeout called to ensure data loaded');
    updateRestaurants();
  }, 1000);
});



More controller stuff from DBHelper:
let dbPromise = DBHelper.openDatabase();  //just do this as soon as the javascript loads?

Database stuff / fetching:

class DBHelper {

  /**
   * For IndexedDB
   */
  static openDatabase() {
    console.log('DBHelper.openDatabase called');
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(DB_NAME, DB_VER, function(upgradeDb) {
      upgradeDb.createObjectStore(DB_OBJ_STORE, {
        keyPath: 'id'
      });
    });
  }

  static saveDataToDatabase(db, json) {
    let tx = db.transaction(DB_OBJ_STORE, 'readwrite');
    let store = tx.objectStore(DB_OBJ_STORE);
    json.forEach(function(restaurant) {
      store.put(restaurant);
    });
  }

  //!!!This gets called 3 times, which seems silly.  Can't you cache the results and then have the other functions check that cache?
  //or... I guess this function itself should check the cache first.  If it exists, then just pull from the cache.
  //^Still... is accessing the cache 3 times necessary?  Can't you grab once from the cache and reuse that?
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    console.log('DBHelper.fetchRestaurants called.');

    /*  !!!! For some reason, this function is getting called twice early on, thus requests from the network TWICE.  Hmmm.*/
    //pretty sure this is from main.js calling fetchNeighbors then fetchCuisine.  I guess I could have the first function
    //return a promise?

    //huh, apparently my restaurants.length thing isn't working?  That's apparently also true if the database hasn't opened yet???
    //***That's just on the initial load EVEN IF there's already a database.  Which is weird...
    //so my guess is that closing the browser and revisiting when the server isn't running = data from the database won't be displayed
    //because it will think it doesn't exist for some reason.  Hmmm.
    //That's weird:  closing incognito window and then opening again = the database was EMPTY.  ???
    //...It doesn't persist but Cache does through a closed browser?  
    //Hmmm, must be so!  Database persisted in a normal browser tab, and correctly pulled from that database.

    //Otherwise, I think this is working!  Just sillily inefficient (requesting data from the database multiple times)

    //super laggy sometimes when going to individual restaurant page.  Not sure what it's waiting for.  Can the databse open
    //happen sooner/faster?  ALSO super laggy when coming back to the main page.  Database operation must be really slow?
    //**It's when the message from the service worker isn't received.  Then the timeout takes really long to happen...
    //I guess I could shorten the timeout length.  But... I think the opendatabase thing is just slow

    //well, here's what I want it do:  grab entries from database if it exists (and they're in there), otherwise go to network
    dbPromise.then(function(db) {
      //grab the JSON data from the database
      console.log('looking at potential data from database');
      let store = db.transaction(DB_OBJ_STORE).objectStore(DB_OBJ_STORE);

      //store.getAll is a promise that resolves to an array, length 0 if no entries
      store.getAll().then(function(restaurants) {
        if (restaurants.length === 0) {  //no data in the database, so fetch from network (and save to database)
          fetch(DBHelper.DATABASE_URL + 'restaurants').then(function(response) {
            console.log('requesting json from server');
            if (response.status === 200) {
              response.json().then(function(json) {
                //do I have to clone something here?
                //now have the restaurant data, so first store it in the database.  Then return it to whatever asked for it.
                DBHelper.saveDataToDatabase(db, json);
                callback(null, json);
              });
            }
          }).catch(function(err) {
            console.log('This error in going to network in fetchRestaurants: ' + err);
            callback(err, null);
          });
        }
        else { //already have data, so just return it from the database
          console.log('returning data from database:');
          console.log(restaurants);

          callback(null, restaurants);

          //can there be an error here?  No, I think you'd place a catch after the store.getAll()'s .then if there was a problem
          //in the database
        }
      });
    });
  }

}`