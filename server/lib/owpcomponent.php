<?php

class owpcomponent extends k_Component {
    function url($path = "", $params = array()) {
        return $this->context->url($path, $params);
    }
}
