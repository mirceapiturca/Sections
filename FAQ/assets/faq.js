(function FAQ(SectionsDesign) {
  'use strict';
  
  if (SectionsDesign.faq) return;
  SectionsDesign.faq = {};
  
  var support = getSupport();
 
  var init = function() {
    var configNodes = Array.from(document.querySelectorAll('[data-faq-config]'));
    
    configNodes.map(configNode => {
      var section = compose(publicAPI, setEvents, getBlocks, getConfig)(configNode);
      SectionsDesign.faq[section.id] = section;
    });
  }
  
  init();
 
  function publicAPI(config) {
    return {
      id: config.sectionId,
      config: config,
      blocks: zipObj(config.blockIds, config.blocks),
      init: init
    }
  }

  //**************************


  /**
   * Click event.
   * @param {Object} block Section block elements and methods.
   * @return {Object} Section block elements and methods.
   */
  function blockEvents(block) {
    if (block.trigger.hasAttribute('data-faq-init')) return block;
    
    block.trigger.setAttribute('data-faq-init', true);
    block.trigger.addEventListener('click', triggerClick);
                                   
    function triggerClick() {
      toggle(block);
    }

    return block;
  }

  /**
   * Toggle block state.
   * @param {Object} block Section block elements and methods.
   * @return {Object} Section block elements and methods.
   */
  function toggle(block) {
    block.collapsed ? expand(block) : collapse(block);
    return block;
  }
  
  /**
   * Expand block.
   * @param {Object} block Section block elements and methods.
   * @return {Object} Section block elements and methods.
   */
  function expand(block) {
    block.button.setAttribute('aria-expanded', true);
    block.panel.removeAttribute('hidden');
    animate(block.panel, 'normal');
    return block;
  }
  
  /**
   * Collapse block.
   * @param {Object} block Section block elements and methods.
   * @return {Object} Section block elements and methods.
   */
  function collapse(block) {
    block.button.setAttribute('aria-expanded', false);
    block.panel.setAttribute('hidden', '');
    animate(block.panel, 'reverse');
    return block;
  }
  
  /**
   * Collapse block.
   * @param {Object} block Section block elements and methods.
   * @return {boolean} Collapsed block state.
   */
  function isCollapsed(block) {
    return Boolean(block.button.getAttribute('aria-expanded') === 'false');
  }

  /**
   * Collapse block.
   * @param {HTMLElement} element Block panel element to animate.
   * @param {String} direction Animation direction, normal or reverse.
   * @return {undefined} Nothing to return.
   */
  function animate(element, direction) { 
    if (!support.WebAnimations) return;

    element.setAttribute('data-is-animating', true);

    element.animate([
      { height: 0 },
      { height: element.offsetHeight + 'px' }],

      { duration: 240,
        fill: 'both',
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        direction: direction
      }

    ).onfinish = function() {
      element.removeAttribute('data-is-animating');
      this.cancel();
    };
  }

  //**************************


  /**
   * Maps all block IDs to exposed block API.
   * @param {Object} config Section and section blocks IDs.
   * @return {Object} config Section and section blocks IDs.
   */
  function getBlocks(config) {
    config.blocks = config.blockIds.map(block);
    return config;
  }

  /**
   * Create section block API.
   * @param {String} blockId Section Liquid block ID.
   * @return {Object} block elements and methods.
   */
  function block(blockId) {
    return {
      trigger: document.querySelector('[data-faq-trigger="' + blockId + '"]'),
      button: document.querySelector('[data-faq-button="' + blockId + '"]'),
      panel: document.querySelector('[data-faq-panel="' + blockId + '"]'),

      get collapsed() { return isCollapsed(this) },
      select: function select() { return expand(this) },
      deselect: function deselect() { return collapse(this) }
    }
  }

  /**
   * Adds event listeners to block elements.
   * @param {Object} config Section and section blocks IDs.
   * @return {Object} config Section and section blocks IDs.
   */
  function setEvents(config) {
    config.blocks.forEach(blockEvents);
    return config;
  }

  /**
   * Pass the Liquid assigned section variabiles.
   * @param {HTMLElement} element Configuration script node.
   * @return {Object} Section and section blocks IDs.
   */
  function getConfig(node) {
    return JSON.parse(node.innerHTML);
  }

  /**
   * Feature detection.
   * @return {Object} Browser support.
   */
  function getSupport() {
    return {
      WebAnimations: (typeof Element.prototype.animate === 'function')
    }
  }

  //**************************


  /**
   * Creates a new object out of a list of keys and a list of values.
   * Key/value pairing is truncated to the length of the shorter of the two lists.
   * @example
   *    zipObj(['a', 'b', 'c'], [1, 2, 3]); //=> {a: 1, b: 2, c: 3}
   * @param {Array} keys The array that will be properties on the output object.
   * @param {Array} values The list of values on the output object.
   * @return {Object} The object made by pairing up same-indexed elements of `keys` and `values`.
   */
  function zipObj(keys, values) {
    return keys.reduce(
      function zipObj(acc, key, idx) {
        acc[key] = values[idx];
        return acc;
      }, {}
    )
  }

  /**
   * Performs right-to-left function composition.
   * The rightmost function may have any arity, the remaining functions must be unary.
   * @example
   *   function plus1(n) {return n + 1};
   *   function plus2(n) {return n + 2};
   *   compose(plus2,plus1)(1) => 4
   * @return {Function} Composed function
   */
  function compose() {
    var funcs = Array.prototype.slice.call(arguments).reverse();
    return function() {
      return funcs.slice(1).reduce(function(res, fn) {
        return fn(res);
      }, funcs[0].apply(undefined, arguments));
    };
  }
  
})(window.SectionsDesign = window.SectionsDesign || {});
