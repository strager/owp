<?php

class components_game_game extends k_Component {
    function map($name) {
        switch ($name) {
        case 'play':
            return 'components_game_play';
        }
    }

    function renderHtml() {
        return 'game';
    }
}
