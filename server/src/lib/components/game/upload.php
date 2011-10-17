<?php

class components_game_upload extends owpcomponent {
    protected $templates;
    protected $mapGateway;
    protected $uploadGateway;

    function __construct(k_TemplateFactory $templates, model_MapGateway $mapGateway, model_UploadGateway $uploadGateway) {
        $this->templates = $templates;
        $this->mapGateway = $mapGateway;
        $this->uploadGateway = $uploadGateway;
    }

    function renderHTML() {
        $this->document->setTitle('Upload map');

        $t = $this->templates->create('upload-map');
        return $t->render($this, array(
        ));
    }

    function postMultipart() {
        // Konstrukt's file access crap won't give us a fucking file handle, 
        // so we do things the old fashion way.
        $osz = @$_FILES['osz'];
        if ($osz) {
            if ($osz['error']) {
                return new k_HttpResponse(500, 'Error code ' . $osz['error']);
            }

            $maps = null;
            $oszFilePath = $osz['tmp_name'];
            try {
                $upload = $this->uploadGateway->reportUpload('osz', $osz['name'], $oszFilePath, $this->remoteAddr());
                $maps = $this->mapGateway->saveOsz($oszFilePath, $upload);
            } catch (Exception $e) {
                // wtb finally
                unlink($oszFilePath);
                throw $e;
            }

            if (empty($maps)) {
                return new k_HttpResponse(500);
            }

            // TODO Uploaded maps page
            return new k_SeeOther($this->url(array('game', 'play'), $maps[0]->urlParams()));
        } else {
            return new k_HttpResponse(400, 'Bad request'); // Bad request
        }
    }
}
