/*** Globals ***/
const model, view, controller;

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
    array = this._arrNeighborhoodOptions;
    if (propertyName === 'cuisine_type') {
      array = this._arrCuisineOptions;
    }

    // Get the different values of the property from all restaurants
    const arrValues = this._arrRestaurants.map((obj) => obj.propertyName);
    // Remove duplicates from the array
    const uniqueValues = arrValues.filter((value, index) => arrValues.indexOf(v) == index);
    array = uniqueValues;
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

  /*
   * Arguments: 
   * selectField = which field to grab from (view._neighborhoodSelect or view._cuisineSelect)
   */
  getSelectedOption(selectField) {
    const index = selectField.selectedIndex;
    return selectField[index].value;
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
      this._restaurantsList.append(createRestaurantHTML(restaurant));  //will this be able to call another function in this class?  Or do I need to specify View.
    });
  }

  /*** Google Map Related ***/

  //might be able to change some of this stuff now since the page won't be tied to/dependent on the map
  initMap() {
    isMapLoaded = True;
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    this._map = new google.maps.Map(this._mapDiv, {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
    this._map.setAttribute("style","height:400px");
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
    this._displayedRestaurants.forEach(function(restaurant) {
      const marker = createMapMarker(restaurant);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url
      });
      this._mapMarkers.push(marker);
    });
  }

  removeMapMarkers() {
    this._mapMarkers.forEach(marker => marker.setMap(null));
    this._mapMarkers = [];
  }
}


//controller:
//open the database
//fetch all the JSON data (either from database or network), give to model
    //service worker and have it start caching data  (unless, would waiting to do this later speed up initial page load?)
//add new properties to each restaurant in the model
//filter the data for the select fields
  //all data now obtained
//fill select fields
//get filtered restaurants from the model with data from view's getSelectedOption(selectField), pass to view's setDisplayedRestaurants
//handle map stuff, adding markers


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
}





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