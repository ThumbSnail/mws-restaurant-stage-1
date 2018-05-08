/**
 * For IndexedDB
 */
const DB_NAME = 'db-restaurant-reviews';
const DB_VER = 1;
const DB_OBJ_STORE = 'restaurants';

/**
 * Common database helper functions.
 */
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

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
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

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}

let dbPromise = DBHelper.openDatabase();  //just do this as soon as the javascript loads?