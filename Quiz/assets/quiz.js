/*! quiz.js
    v0.1 (c) Mircea Piturca
    MIT License
*/
(function Quiz(){
  'use strict';

  var support = getSupport();
  var config = JSON.parse( document.querySelector('[data-quiz-config]').innerHTML );
  var filtersData = Object.freeze( objMap(validate, config.filters) );
  var productData = Object.freeze( config.products );
  var nodes;

  compose(themeEditor, init)();

  function init(){
    nodes = {
      doc: [document],
      track: head(nodeList('.quiz-track')),
      panels: nodeList('.quiz-panel'),
      answers: nodeList('[data-answer-trigger]'),
      controls: nodeList('[data-quiz-index]'),
      showResults: nodeList('[data-show-results]')
    }

    // Answer input select
    nodes.answers.map(partial(addEvent, 
      'change', compose(UIheroUpdate, value, target)
    ));

    // Show results link click
    nodes.showResults.map(partial(addEvent, 
      'click', compose(UIshowResults, UIupdateResults, filterProducts, mapFilters, selectedFilters, selectedAnswers)
    ));

    // Next|Prev link click
    nodes.controls.map(partial(addEvent, 
      'click', compose(UIgoTo, UIdirection, target, preventDefault)
    ));

    // Question scroll/swipe
    nodes.doc.map(partial(addEvent, 
      'quiz-question-change', compose(UIloadImages, UIgetImages, UIupdateHash, UIhideResults, id, target)
    ));

    // Scrollend listner
    support.IntersectionObserver ? 
      initIntersectionObserver(nodes.track, nodes.panels, scrollEndCallback) : initScrollObserver(nodes.track, scrollEndCallback);
  }

  var publicAPI = {
    goTo: UIgoTo,
    next: UInext,
    prev: UIprev,
    index: UIindex,
    nodes: nodes,
    products: productData,
    filters: filtersData,
  }

  window.SectionsDesign = window.SectionsDesign || {};
  window.SectionsDesign.Quiz = publicAPI;
  return publicAPI;


  // ******************************

  function selectedAnswers() {
    return nodeList('[data-answer-trigger]:checked').map(value);
  }

  function selectedFilters(ids) {
    return flatten(props(ids, filtersData).filter(not(isEmpty)));
  }

  function mapFilters(filters) {
    var fnMap = { price: priceFilter, tag: tagFilter, type: typeFilter, vendor: vendorFilter, option: optionFilter }
    return filters.map(function(filter) {
      return partial(fnMap[filter.type], filter.args);
    });
  }

  function filterProducts(filterFns) {
    return productData.filter(function(product) {
      return allPass(filterFns, product);
    });
  }

  function UIshowResults() {
    last(nodes.panels).removeAttribute('hidden');
  }

  function UIhideResults(panelId) {
    var resultsPanel = last(nodes.panels);
    if (panelId !== id(resultsPanel)) {
      debounce(function(){
        resultsPanel.setAttribute('hidden', true);
      }, 500)();
    }
    return panelId;
  }

  function UIupdateResults(productArr) {
    var html = productArr.reduce(function(acc, product){
      acc += product.html;
      return acc;
    }, '');

    last(nodes.panels).querySelector('.quiz-main').innerHTML = html;
  }

  function UIheroUpdate(answerId) {
    var index = UIindex();
    var oldImage = document.querySelector('[data-question-index="' + index + '"][data-image-selected]');
    var newImage = document.querySelector('[data-img="' + answerId + '"]');

    (newImage && support.CSSAnimation) ? imageChangeAnimate() : imageChange();

    function imageChangeAnimate() {
      newImage.addEventListener('animationend', imageChange);
      newImage.setAttribute('data-image-animated', true);
      newImage.setAttribute('data-image-selected', true);

      if (oldImage) {
        oldImage.setAttribute('data-image-animated', true);
        oldImage.removeAttribute('data-image-selected', true);
      }
    }

    function imageChange() {
      newImage.setAttribute('data-image-selected', true);
      newImage.removeAttribute('data-image-animated');
      newImage.removeEventListener('animationend', imageChange);

      if (oldImage) {
        oldImage.removeAttribute('data-image-selected');
        oldImage.removeAttribute('data-image-animated');
      }
    }
  }

  function UIindex() {
    var index = Math.round(nodes.track.scrollLeft / nodes.track.getBoundingClientRect().width);
    return clamp(index, 0, nodes.panels.length);
  }

  function UIdirection(element) {
    return Number(attr('data-quiz-index', element));
  }

  function UIgoTo(index) {
    var track = nodes.track;
    var panel = head(nodes.panels);
    var x = track.getBoundingClientRect().width * index;

    (support.scrollBehavior || !support.customProperties) ? nativeScroll() : fallbackScroll();

    function nativeScroll() {
      track.scrollLeft = x;
    }

    function fallbackScroll() {
      track.style.setProperty('--scroll-x', (track.scrollLeft - x) + 'px');
      track.setAttribute('data-scroll-animation', true);
      panel.addEventListener('animationend', endAnimation);
    }

    function endAnimation() {
      panel.removeEventListener('animationend', endAnimation);
      track.removeAttribute('data-scroll-animation');
      nativeScroll();
    }
    
    return index;
  }

  function UInext() {
    var index = UIindex();
    var nextIndex = clamp((index + 1), 0, nodes.panels.length);
    return UIgoTo(nextIndex);
  }

  function UIprev() {
    var index = UIindex();
    var prevIndex = clamp((index - 1), 0, nodes.panels.length);
    return UIgoTo(prevIndex);
  }

  function UIupdateHash(panelId) {
    var newHash = '#' + panelId;
    var oldHash = window.location.hash;
    var shouldUpdate = not(equals)(newHash, oldHash);

    if (support.pushState && shouldUpdate) history.replaceState(null, null, newHash);
    return panelId;
  }

  function UIgetImages(panelId) {
    return nodeList('#' + panelId + ' [data-img]');
  }

  function UIloadImages(imagesArr) {
    var changeSrcset = partial(attrTransfer, 'data-lazy-srcset', 'srcset');
    var changeSrc = partial(attrTransfer, 'data-lazy-src', 'src');
    return imagesArr.map(changeSrcset).map(changeSrc);
  }

  /* Scroll */
  function scrollEndCallback(entries) {
    if (support.IntersectionObserver) {
      // IntersectionObserver callback
      var inView = entries.filter(function(entry){
        return (Math.round(entry.intersectionRatio) === 1);
      });

      if (inView.length > 0) {
        emitEvent('quiz-question-change', { target: head(inView).target });
      }
    } else {
      // ScrollObserver callback
      emitEvent('quiz-question-change', { target: nodes.panels[UIindex()] });
    }
  }

  function initIntersectionObserver(root, rootNodes, callback) {
    var observer = new IntersectionObserver(callback, { root: root, threshold: 0.5 } );
    rootNodes.map(function(element) {
      observer.observe(element);
    })
  }

  function initScrollObserver(root, callback) {
    var initScroll = debounce(callback, 160);
    addEvent('scroll', initScroll, root);
    root.addEventListener('scroll', initScroll);

    // Init an initial change event to preload the panel images
    emitEvent('quiz-question-change', { target: nodes.panels[UIindex()] });
  }

  /* Validation */
  function validate(filters) {
    return filters.filter(function(filter) {
      var fnMap = { tag: arrValidation, type: arrValidation, vendor: arrValidation, price: priceValidation, option: optionValidation }
      var isValid = fnMap[filter.type];
      return not(isEmpty)(filter.args) && isValid(filter.args);
    })
  }

  function arrValidation(args) {
    return isArray(args);
  }
  
  function priceValidation(args) {
    return isNumber(head(args));
  }

  function optionValidation(args) {
    return isString(head(args)) && isArray(last(args));
  }
  
  /* Filters */
  function tagFilter(args, product) {
    return contains(args, product.tags);
  }
  
  function typeFilter(args, product) {
    return contains(args, product.type);
  }

  function vendorFilter(args, product) {
    return contains(args, product.vendor);
  }

  function priceFilter(args, product) {
    var operator = last(args);
    var n1 = product.price;
    var n2 = head(args);
    return numberComparison(operator, n1, n2);
  }

  function optionFilter(args, product) {
    var filterName = head(args);
    var filterValues = last(args);
    return product.options.some(function(option){
      return equals(option.name, filterName) && contains(option.values, filterValues);
    })
  }

  function numberComparison(operator, n1, n2) {
    if (operator === '=') return n1 === n2;
    else if (operator === '<') return n1 < n2;
    else if (operator === '>') return n1 > n2;
    else if (operator === '<=') return n1 <= n2;
    else if (operator === '>=') return n1 >= n2;
  }

  /* Event */
  function addEvent(type, fn, element) {
    element.addEventListener(type, fn);
  }

  function createEvent(eventType, data) {
    return new CustomEvent(eventType, { detail: data });
  }

  function emitEvent(eventType, data) {
    document.dispatchEvent(createEvent(eventType, data));
  }

  function preventDefault(evt) {
    evt.preventDefault();
    return evt;
  }

  function target(evt) {
    return (evt.detail && evt.detail.target) ? evt.detail.target : evt.target;
  }

  /* DOM */
  function id(element) {
    return element.id;
  }

  function attr(str, element) {
    return element.getAttribute(str);
  }

  function value(element) {
    return attr('value', element);
  }

  function nodeList(str, root) {
    if (!root) root = document;
    var nodeList = root.querySelectorAll(str);
    return Array.prototype.slice.call(nodeList);
  }

  function attrTransfer(attr1, attr2, element) {
    nodeList('[' + attr2 + ']', element).map(function(el) {
      var newAttr = el.getAttribute(attr1);
      if (newAttr) {
        el.setAttribute(attr2, newAttr);
        el.removeAttribute(attr1);
      }
      return el;
    })
  }
  
  /* Object */
  function equals(a, b) {
    return a === b;
  }

  function keys(obj) {
    return Object.keys(obj);
  }

  function objMap(fn, obj) {
    return keys(obj).reduce(function(acc, key){
      acc[key] = fn(obj[key]);
      return acc;
    }, {});
  }

  function isNumber(arg) {
    return !isNaN(Number(arg));
  }

  function isString(arg) {
    return typeof arg === 'string' && arg.length !== 0;
  }

  function clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
  }

  // Array
  function isArray(arg) {
    return Array.isArray(arg);
  }

  function isEmpty(arr) {
    return flatten(arr).every(function(item){
      return item.length < 0;
    });
  }

  function contains(arr1, arr2) {
    return arr1.some(function(value){
      return arr2.indexOf(value) !== -1;
    });
  }

  function flatten(arr) {
    return arr.reduce(function(acc, val) {
      return isArray(val) ? acc.concat(flatten(val)) : acc.concat(val);
    }, []);
  }

  function last(arr) {
    return arr[arr.length - 1];
  }

  function head(arr) {
    return arr[0];
  }

  function props(arr, obj) {
    return arr.reduce(function(acc, val){
      acc.push(obj[val]);
      return acc;
    }, []);
  }
  
  /* Fn */
  function not(predicate) {
    return function negated() {
      return !predicate.apply(undefined, arguments);
    };
  }

  function allPass(fns, arg) {
    var predicates = fns.map(function(fn) {
      return fn(arg);
    });
    return predicates.indexOf(false) === -1;
  }

  function debounce(fn, wait, immediate) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) fn.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) fn.apply(context, args);
    };
  }

  function partial(fn) {
    var slice = Array.prototype.slice;
    var args = slice.call(arguments, 1);
    return function() {
      return fn.apply(this, args.concat(slice.call(arguments, 0)));
    };
  }

  function compose() {
    var funcs = Array.prototype.slice.call(arguments).reverse();
    return function() {
      return funcs.slice(1).reduce(function(res, fn) {
        return fn(res);
      }, funcs[0].apply(undefined, arguments));
    };
  }

  /* Support */
  function getSupport() {
    return {
      IntersectionObserver: 'IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype,
      CSSAnimation: 'animation' in document.body.style,
      pushState: window.history && window.history.pushState,
      customProperties: window.CSS && CSS.supports('color', 'var(--primary)'),
      scrollBehavior: 'scrollBehavior' in document.body.style
    }
  }

  /* Theme editor */
  function themeEditor() {
    document.addEventListener('shopify:block:select', function(evt) {
      publicAPI.goTo(config.blocks[evt.detail.blockId]);
    });

    document.addEventListener('shopify:section:load', function() {
      document.querySelector('.quiz-track').style.scrollBehavior = 'initial';
      init();
    });
  }

})();
