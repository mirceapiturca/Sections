/*! tooltips.js
    v0.1 (c) Mircea Piturca
    MIT License
*/
(function Tooltips(SD){
  'use strict';
  
  var support = getSupport();
  var instances = nodeList('[data-tooltips-config]');

  instances.map(function(instance){
    var config = Object.freeze(getConfig(instance));

    var publicAPI = {
      tooltips: function() { return getTooltips(config) },
      tooltip: getTooltip,
      select: select,
      deselect: deselect,
      config: config,
      init: init
    }

    if (!SD[config.sectionId]) init(config);    
    SD[config.sectionId] = publicAPI;
    
    return publicAPI;
  })


  // ******************************

  function init(config) {
    var tooltips = getTooltips(config);
    var triggers = pluck(tooltips, 'trigger');

    triggers.map(function(element) {
      element.addEventListener('click', function triggerClick() {
        tooltipClick(tooltips, element.value);
      });
    });
  }

  function getConfig(instance) {
    return JSON.parse(instance.innerHTML);
  }

  function getTooltips(config) {
    return config.blocksId.map(getTooltip);
  }

  function getTooltip(id) {
    var host = document.getElementById('tooltip-' + id);

    return {
      id: id,
      trigger: host.querySelector('[data-tooltip-trigger]'),
      overlay: host.querySelector('[data-tooltip-overlay]'),
      markup: host.querySelector('[data-tooltip-markup]'),
      get collapsed() { return isCollapsed(this) }
    }
  }

  function tooltipClick(tooltips, id) {
    var isSelected = partial(idMatch, id);
    tooltips.filter(isSelected).map(toggle);
    tooltips.filter(not(isSelected)).filter(not(isCollapsed)).map(collapse);
  }
  
  function toggle(tooltip) {
    tooltip.collapsed ? expand(tooltip) : collapse(tooltip);
  }

  function expand(tooltip) {
    tooltip.overlay.innerHTML = tooltip.markup.textContent;
    tooltip.overlay.style.setProperty('--end-h', height(tooltip));
    tooltip.overlay.style.setProperty('--start-h', '0px');
    tooltip.trigger.setAttribute('aria-expanded', true);

     tooltip.overlay.addEventListener('animationend', function animationEndFn() {
      animationReset(tooltip.overlay, animationEndFn);
    });

    return tooltip;
  }

  function collapse(tooltip) {
    tooltip.overlay.style.setProperty('--start-h',  height(tooltip));
    tooltip.overlay.style.setProperty('--end-h', '0px');
    tooltip.trigger.setAttribute('aria-expanded', false);
    
    if (!support.customProperties) tooltip.overlay.innerHTML = '';

    tooltip.overlay.addEventListener('animationend', function animationEndFn() {
      animationReset(tooltip.overlay, animationEndFn);
      tooltip.overlay.innerHTML = '';
    });

    return tooltip;
  }

  function animationReset(element, callback) {
    element.removeAttribute('style');
    element.removeEventListener('animationend', callback);
  }

  function idMatch(id, tooltip) {
    return tooltip.id === id;
  }

  function isCollapsed(tooltip) {
    return attr('aria-expanded', tooltip.trigger) === 'false';
  }

  function height(tooltip) {
    return px(tooltip.overlay.offsetHeight.toString());
  }

  function px(n) {
    return n + 'px';
  }

  /* DOM */
  function attr(str, element) {
    return element.getAttribute(str);
  }

  function nodeList(str, root) {
    if (!root) root = document;
    var nodeList = root.querySelectorAll(str);
    return Array.prototype.slice.call(nodeList);
  }

  /* Fn */
  function not(predicate) {
    return function negated() {
      return !predicate.apply(undefined, arguments);
    };
  }

  function pluck(array, key) {
    return array.map(function(obj) {
      return obj[key];
    });
  }

  function partial(fn) {
    var slice = Array.prototype.slice;
    var args = slice.call(arguments, 1);
    return function() {
      return fn.apply(this, args.concat(slice.call(arguments, 0)));
    };
  }

  /* Support */
  function getSupport() {
    return {
      customProperties: window.CSS && CSS.supports('color', 'var(--primary)'),
    }
  }

  /* Theme editor */
  function select(blockId) {
    return expand(getTooltip(blockId));
  }

  function deselect(blockId) {
    return collapse(getTooltip(blockId));
  }
  
})(window.SectionsDesign = window.SectionsDesign || {});
