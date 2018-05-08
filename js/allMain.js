/*** Globals ***/
const model, view, controller;

/*** Model ***/
class Model {
  constructor() {
    this._arrRestaurants = [];
  }

  getRestaurants() {
    return this._arrRestaurants;
  }

  //NEED to have model create the URL for an image and save it as a new property on the restaurant object
  //AND also the URL for the restaurant's individual page

  /*loop through all the restaurants to find unique neighborhoods, cuisine, etc., save in variable*/

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
    this._map = document.getElementById('map');
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
    this._map = new google.maps.Map(mapElem, {
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


/*** Initial Setup ***/
document.addEventListener('DOMContentLoaded', function(event) {
  model = new Model();
  view = new View();
  controller = new Controller();
}