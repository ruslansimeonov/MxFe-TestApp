'use client';

import mqtt from "mqtt";
import React, { useEffect, useState } from "react";
// import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import { hasData, hasResult, hasServer, selectDataset, selectProc, setDatasetLoad, setProcResult, setServerState } from "../store/datasetSlice";

export default function DataProcessingHandler() {
  const dispatch = useDispatch();

  const dataLoaded = useSelector(hasData);
  const serverOnline = useSelector(hasServer);
  const dataProcessed = useSelector(hasResult);
  const dataset = useSelector(selectDataset);
  const dataResult = useSelector(selectProc);

  const loadData = (data: number[]) => dispatch(setDatasetLoad(data));
  const loadResult = (res: number) => dispatch(setProcResult(res));
  const loadServerOnline = (data: boolean) => dispatch(setServerState(data));

  useEffect(() => {
    // Publish configuration message here
    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_SERVER
      ?? "tcp://localhost:1883", { clientId: `myapp-configuration-pub` });

    client.on("connect", async () => {
      const msg = {
        isUpdate: true,
        state: 1
      };

      console.log("made new message: ", msg);

      client.publish(
        `myapp/configuration`,
        Buffer.from(JSON.stringify(msg)),
        { qos: 2 }
      );
      // idea to make to have a toggle for ServerOnline status
      // loadServerOnline(true);
    });

    return () => {
      client.end();
      // loadServerOnline(false);
    };

  }, [dataLoaded]);

  useEffect(() => {

    if (dataLoaded) {
      const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_SERVER
        ?? "tcp://localhost:1883", { clientId: `myapp-message-listener` });

      client.subscribe('server/status', (err) => {
        if (err) {
          console.log('Error subscribing to server/status', err);
        } else {
          console.log('Subscribed to server/status');
        }
      })

      client.on('message', (topic, message) => {
        console.log(`Received message on server/status ${topic}: ${message}`);
      })

      const msgToSend = {
        data: dataset,
      }
      client.publish('myapp/dataset', JSON.stringify(msgToSend));

      client.subscribe('server/result', (err) => {
        if (err) {
          console.log('Error subscribing to server/result:', err);
        } else {
          console.log('Subscribed to server/result');
        }
      })

      client.on('message', (topic, message) => {
        const resultServer = JSON.parse(message.toString());
        loadResult(resultServer.data);
      });
      return () => {
        client.end();
      };
    }
  }, [dataLoaded, dataset, loadResult]);

  return (
    <div></div>
  );
}