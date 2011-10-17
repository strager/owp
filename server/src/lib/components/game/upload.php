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

            $oszFilePath = $osz['tmp_name'];
            register_shutdown_function('unlink', $oszFilePath);

            $uploadKey = $this->uploadGateway->getFileUploadKey($oszFilePath);
            $upload = $this->uploadGateway->findUploadByKey($uploadKey);

            $maps = null;
            if ($upload) {
                // File already uploaded and extracted
                // TODO Redirect properly
                return '.osz already uploaded';
            } else {
                $upload = $this->uploadGateway->reportUpload('osz', $uploadKey, $osz['name'], $this->remoteAddr());
                $maps = $this->mapGateway->saveOsz($oszFilePath, $upload);
            }

            if (empty($maps)) {
                return new k_HttpResponse(500);
            }

            return new k_SeeOther($this->url(array('game', 'play'), $maps[0]->urlParams()));
        } else {
            return new k_HttpResponse(400, 'Bad request'); // Bad request
        }
    }
}
