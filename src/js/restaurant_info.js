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
      //element.url = `./restaurant.html?id=${element.id}`;  //not used on this page
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
    return self._arrRestaurants.find(restaurant => restaurant.id == self._currentId);
  }

  toggleRestaurantFavorite(restaurantId) {
    restaurantId--;  //id label is one more than the index value
    this._arrRestaurants[restaurantId].is_favorite = !this._arrRestaurants[restaurantId].is_favorite;
  }

  getRestaurantFavorite(restaurantId) {
    restaurantId--;  //id label is one more than the index value
    return this._arrRestaurants[restaurantId].is_favorite;
  }

  //total up the number of reviews in the model, that will be the index needed for a newly added review
  getNextReviewIndex() {
    let count = 0;
    this._arrRestaurants.forEach(function(restaurant) {
      count += restaurant.reviews.length;
    });

    return count + 1;
  }

  addReview(reviewObj) {
    this._arrRestaurants[this._currentId - 1].reviews.push(reviewObj);
  }

  replaceLastReview(reviewObj) {
    this._arrRestaurants[this._currentId - 1].reviews.pop();
    this._arrRestaurants[this._currentId - 1].reviews.push(reviewObj);
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
    this._offlineMessage = document.getElementById('offline-message');

    /*** Form ***/
    this._formContainer = document.getElementById('form-container');
    this._userName = document.getElementById('form-name');
    this._userRating = document.getElementById('form-rating');
    this._userComments = document.getElementById('form-comments');
  }

  displayOfflineMessage(boolShow) {
    if (boolShow) {
      this._offlineMessage.hidden = false;
    }
    else {
      this._offlineMessage.hidden = true;
    }
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

    const favButton = document.getElementById('toggle-');
    favButton.id = "toggle-" + this._displayedRestaurant.id;
    favButton.alt = "Toggle favorite for " + this._displayedRestaurant.name;  //https://www.w3.org/WAI/tutorials/images/functional/#image-used-in-a-button
    favButton.className = "toggle-favorite";
    if (this._displayedRestaurant.is_favorite) {
      favButton.src = "/img/favStar.svg";
    }
    favButton.onclick = function() {
      controller.toggleFavorite();
    };

    const address = document.getElementById('restaurant-address');
    address.innerHTML = this._displayedRestaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    let strName = this._displayedRestaurant.imgUrl;
    //add error handling in case server doesn't have an image:
    if (strName === '/img/undefined') {
      strName = '/img/generic.png';
      image.alt = "Generic Restaurant Placeholder Image";
    }
    else {
      strName = strName.replace('/img/', '').replace('.jpg', '');
      strName = '/img/' + strName + '-2x.jpg';
      image.alt = this._displayedRestaurant.name;
    }
    image.src = strName;
    //image.srcset = strName + ' 2x';  //serviceworker caches largest photo initially,rendering srcset pointless

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = this._displayedRestaurant.cuisine_type;

    // fill operating hours
    if (this._displayedRestaurant.operating_hours) {
      this.fillRestaurantHoursHTML();
    }

    this.fillReviewsHTML()
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
  fillReviewsHTML(newReview) {
    const ul = document.getElementById('reviews-list');
    if (newReview) {
      ul.appendChild(this.createReviewHTML(newReview));
      return;
    }
    const container = document.getElementById('reviews-container');

    if (!this._displayedRestaurant.reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
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
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
    let dateObj = new Date(review.createdAt);
    let strDate = dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear();
    date.innerHTML = strDate;
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

  updateToggleFavorite() {
    let favButton = document.getElementById('toggle-' + this._displayedRestaurant.id);
    if (this._displayedRestaurant.is_favorite) {
      favButton.src = "/img/favStar.svg";
    }
    else {
      favButton.src = "/img/blankStar.svg";
    }
  }

  /*** Form Related ***/

  showReviewForm() {
    this._formContainer.className = '';
    document.getElementById('btn-review').className = 'hidden-form';
  }

  hideReviewForm() {
    this._formContainer.className = 'hidden-form';
    document.getElementById('btn-review').className = '';
  }

  getFormValues() {
    let formObj = {};
    formObj.name = this._userName.value;
    formObj.rating = this._userRating.value;
    formObj.comments = this._userComments.value;

    return formObj;
  }

  /*** Google Map Related ***/

  /**
   * Initialize Google map and marker
   */
  initMap() {
    const self = this;
    self._map = new google.maps.Map(self._mapDiv, {
      zoom: 16,
      center: self._displayedRestaurant.latlng,
      scrollwheel: false
    });
    self._mapDiv.setAttribute("style","height:400px");

    //add the marker
    const marker = new google.maps.Marker({
      position: this._displayedRestaurant.latlng,
      title: this._displayedRestaurant.name,
      map: this._map,
      animation: google.maps.Animation.DROP
    });
  }

  /*
   * User input now determines whether Google Map displays or not
   */
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

  toggleFavorite() {
    let self = this;
    let restaurant = model.getCurrentRestaurant();
    //update the model
    model.toggleRestaurantFavorite(restaurant.id);
    //update the view
    view.updateToggleFavorite();
    //update the database
    let changedRestaurant = [];  //saveToDatabase expects an array, so give it one
    changedRestaurant.push(restaurant);
    self._dbPromise.then(function(db) {
      self.saveToDatabase(db, changedRestaurant);
    });

    //update the server
    self.putFavorite(changedRestaurant[0].id, changedRestaurant[0].is_favorite);
  }

  putFavorite(id, boolFav) {
    let self = this;
    fetch(this._DATABASE_URL + 'restaurants/' + id + '/?is_favorite=' + boolFav, { method: 'PUT'})
      .then(function(response) {
        //nothing for now
      }).catch(function(error) {
        console.log('Error in favorite toggle: ' + error);
        self.saveServerRequest('putFavorite', {restaurant_id: id, is_favorite: boolFav});
      });
  }

  submitReview() {
    let self = this;
    //update model
    let reviewObj = view.getFormValues();
    //have:  name, rating, comments
    //need:  restaurant_id, id (for the review), createdAt (time), updatedAt (time)
    reviewObj.restaurant_id = model._currentId;
    reviewObj.id = model.getNextReviewIndex();
    reviewObj.createdAt = new Date().getTime();
    reviewObj.updatedAt = reviewObj.createdAt;  //is this meant to be when it successfully goes to the server?  (or in theory a user should be able to edit their review?)

    model.addReview(reviewObj);

    //update view
    view.fillReviewsHTML(reviewObj);

    //update database
    let changedRestaurant = [];  //saveToDatabase expects an array, so give it one
    changedRestaurant.push(model.getCurrentRestaurant());
    self._dbPromise.then(function(db) {
      self.saveToDatabase(db, changedRestaurant);
    });

    //update server
    self.postReview(reviewObj);
    //hide the form entry
    view.hideReviewForm();
  }

  postReview(reviewObj) {
    let self = this;
    fetch(self._DATABASE_URL + 'reviews/', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(reviewObj)
      }).then(function(response) {
        //in this app's current state, this ends up being unnecessary:
        /*if (response.status >= 200  && response.status < 300) {  //success
          response.json().then(function(updatedReview) {
            //server may have assigned a different id or creation time; thus, update the model accordingly
            model.replaceLastReview(updatedReview);
            //update the database to reflect this change:
            let changedRestaurant = [];  //saveToDatabase expects an array, so give it one
            changedRestaurant.push(model.getCurrentRestaurant());
            self._dbPromise.then(function(db) {
              self.saveToDatabase(db, changedRestaurant);
            });
          });
        }*/
      }).catch(function(error) {
        console.log('Error in posting review: ' + error);
        if(!navigator.onLine) {  //no internet connection currently, so add this new request to the queue of requests to make once the connection is regained
          self.saveServerRequest('postReview', reviewObj);
        }
      });
  }

  /*** For storing server requests to try again once internet connection is reestablished ***/
  //saving in local storage since user might regain internet on a different page from where connection was lost
  saveServerRequest(functionToCall, dataToSend) {
    let arrRequests = [];
    if (localStorage.hasOwnProperty('serverRequests')) {
      //then an array already exists, so grab it first
      arrRequests = JSON.parse(localStorage.getItem('serverRequests'));
    }

    let objRequest = {
      func: functionToCall,
      data: dataToSend
    };
    arrRequests.push(objRequest);

    //store in local storage to call later:
    localStorage.setItem('serverRequests', JSON.stringify(arrRequests));
  }

  executeSavedServerRequests(arrRequests) {
    let self = this;

    arrRequests.forEach(function(request) {
      if (request.func === 'putFavorite') {
        self.putFavorite(request.data.restaurant_id, request.data.is_favorite);
      }
      else {  //it's a post review request
        self.postReview(request.data)
      }
    });
  }

  /*** IndexedDB Related ***/

  openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve();

    let self = this;

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
    let self = this;

    //First, check the database
    return self._dbPromise.then(function(db) {
      let store = db.transaction(self._DB_OBJ_STORE).objectStore(self._DB_OBJ_STORE);
      return store.getAll().then(function(arrRestaurants) {
        if (arrRestaurants.length === 0) {  //no data in the database, so fetch from network (and save to database)
          return fetch(self._DATABASE_URL + 'restaurants').then(function(response) {
            console.log('requesting json from server');
            if (response.status === 200) {
              return response.json().then(function(restaurants) {  //store data in the database and return it to what asked for it
                //for each restaraunt, add a reviews property with a blank array
                restaurants.forEach(function(restaurantObject, index) {
                  restaurantObject.reviews = [];
                  restaurants[index] = restaurantObject;
                });

                // now also grab the review data for each restaurant (so that any page can be accessed with full details offline upon first vist)
                return fetch(self._DATABASE_URL + 'reviews').then(function(response) {
                  if (response.status === 200) {
                    return response.json().then(function(reviews) {
                      //for each review, get its restaurant id and push that review in the right restaurant's reviews array
                      reviews.forEach(function(reviewObject) {
                        //restaurant_id is off the array index by 1, so subtract 1
                        restaurants[reviewObject.restaurant_id - 1].reviews.push(reviewObject);
                      });

                      self.saveToDatabase(db, restaurants);
                      return restaurants;
                    });
                  }
                });
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

  registerServiceWorker() {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  }

  /*
   * Have the controller coordinate everything (fetching model data, updating view)
   */
  loadContent() {
    const self = this;
    self.fetchRestaurantData().then(function(json) {
      /*** Model Related ***/
      model.addFetchedRestaurants(json);  //this now handles getting all the reviews
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

  controller.registerServiceWorker();  //register serviceworker on this subpage in case user visited the subpage directly and didn't come via the main page
  controller.loadContent();

  //for loss/regain of internet connectivity:  (via:  https://davidwalsh.name/detecting-online)
  /*** Handle any issues if connectivity was or is lost:  ***/
  if (!navigator.onLine) {
    view.displayOfflineMessage(true);
  }
  else {
    //execute any stored serverRequests
    if (localStorage.hasOwnProperty('serverRequests')) {
      //now execute those server requests
      controller.executeSavedServerRequests(JSON.parse(localStorage.getItem('serverRequests')));

      //remove from localStorage:
      localStorage.removeItem('serverRequests');
    }
  }

  //for loss/regain of internet connectivity:
  window.addEventListener('offline', function() {
    view.displayOfflineMessage(true);
  });

  window.addEventListener('online', function() {
    view.displayOfflineMessage(false);
    
    if (localStorage.hasOwnProperty('serverRequests')) {
      //now execute those server requests
      controller.executeSavedServerRequests(JSON.parse(localStorage.getItem('serverRequests')));

      //remove from localStorage:
      localStorage.removeItem('serverRequests');
    }
  });
});