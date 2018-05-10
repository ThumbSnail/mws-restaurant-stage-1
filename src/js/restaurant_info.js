/*** Globals ***/
let model, view;
var controller;  //This uses var because controller needs to be available globally so that Google Maps can access it as its callback

/*** Model ***/
class Model {
  constructor() {
    this._arrRestaurants = [];  //all restaurants will already be in the database, so just use same code
    this._currentId = this.extractIdFromURL();
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
      //element.url = `./restaurant.html?id=${element.id}`;
    });
  }

  extractIdFromURL() {
    //url is of the form:  /restaurant.html?id=##
    let url = window.location.href;
    let id = url.substring(url.indexOf('=') + 1); //grab the numbers at the end of the url

    return id;
  }

  getCurrentRestaurant() {
    const self = this;
    return self._arrRestaurants.find(restaurant => restaurant.id == self._currentId);  //test this without self to see arrow function 'this' stuff
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
    //url: string  (url of the individual restaurant's page)
  ***/

/*** View ***/
class View {
  constructor() {
    /*** Google Map ***/
    this._map = '';
    this._mapDiv = document.getElementById('map');
    this._mapMarkers = [];
    this._isMapDisplayed = false;
    this._showMapBtn = document.getElementById('show-map');

    this._displayedRestaurant = '';
  }

  /*** Restaurant Entry Related ***/

  setDisplayedRestaurant(restaurant) {
    this._displayedRestaurant = restaurant;
  }

  /**
   * Create restaurant HTML and add it to the webpage
   */
  fillRestaurantHTML() {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = this._displayedRestaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = this._displayedRestaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img'
    let strName = this._displayedRestaurant.imgUrl;
    strName = strName.replace('/img/', '').replace('.jpg', '');
    strName = '/img/' + strName + '-2x.jpg';
    image.src = strName;
    //image.srcset = strName + ' 2x';  //serviceworker renders this pointless
    image.alt = this._displayedRestaurant.name;

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = this._displayedRestaurant.cuisine_type;

    // fill operating hours
    if (this._displayedRestaurant.operating_hours) {
      this.fillRestaurantHoursHTML();
    }
    // fill reviews
    this.fillReviewsHTML();
  }

  /**
   * Create restaurant operating hours HTML table and add it to the webpage.
   */
  fillRestaurantHoursHTML() {
    const hours = document.getElementById('restaurant-hours');
    for (let key in this._displayedRestaurant.operating_hours) {
      const row = document.createElement('tr');

      const day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      const time = document.createElement('td');
      let strTime = this._displayedRestaurant.operating_hours[key];
      strTime = strTime.replace(', ', '<br>');
      time.innerHTML = strTime;
      row.appendChild(time);

      hours.appendChild(row);
    }
  }

  /**
   * Create all reviews HTML and add them to the webpage.
   */
  fillReviewsHTML() {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!this._displayedRestaurant.reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    this._displayedRestaurant.reviews.forEach(review => {
      ul.appendChild(this.createReviewHTML(review));  //see if the this here works
    });
    container.appendChild(ul);
  }

  /**
   * Create review HTML and add it to the webpage.
   */
  createReviewHTML(review) {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = review.date;
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.className = "rating-text";
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.className = 'review-text';
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
  }

  /**
   * Add restaurant name to the breadcrumb navigation menu
   */
  fillBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = this._displayedRestaurant.name;
    breadcrumb.appendChild(li);
  }

  /*** Google Map Related ***/

  /**
   * Initialize Google map
   */
  initMap() {
    const self = this;
    self._map = new google.maps.Map(self._mapDiv, {
      zoom: 16,
      center: self._displayedRestaurant.latlng,
      scrollwheel: false
    });
    self._mapDiv.setAttribute("style","height:400px");

    //add the marker  (does creating it place it on the map?)
    const marker = new google.maps.Marker({
      position: this._displayedRestaurant.latlng,
      title: this._displayedRestaurant.name,
      map: this._map,
      animation: google.maps.Animation.DROP
    });
  }

  enableButton() {
    this._showMapBtn.innerText = "Show Google Maps";
    this._showMapBtn.disabled = false;
  }

  showMap() {
    this.initMap();
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
      view.enableButton();
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
  loadContent() {
    const self = this;
    self.fetchRestaurantData().then(function(json) {
      /*** Model Related ***/
      model.addFetchedRestaurants(json);
      model.addUrlsToRestaurants();

      /*** View Related ***/
      view.setDisplayedRestaurant(model.getCurrentRestaurant());
      view.fillRestaurantHTML();
      view.fillBreadcrumb();

      self.readyForMap();
    });
  }
}

/*** Load the Page ***/

document.addEventListener('DOMContentLoaded', function(event) {
  model = new Model();
  view = new View();
  controller = new Controller();

  controller.loadContent();
});