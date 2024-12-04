import { PlayIcon } from '@heroicons/react/20/solid'
import React from 'react';

interface IGameInfo {
    name: string;
    title: string;
    domain: string;
    gameUri: string;
    image: string;
}

export default function GameSelectionCards(props: {games: IGameInfo[]}) {
  return (
    <ul role="list" className="grid grid-cols-1 gap-24 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
      {props.games.map((game) => (
        <li
          key={game.title}
          className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-lg py-1"
        >
          <div className="flex flex-1 flex-col p-8">
            <img className="mx-auto h-32 w-32 flex-shrink-0" src={game.image} alt="" />
            <h3 className="mt-6 text-sm font-bold text-gray-900">{game.name}</h3>
            <dl className="mt-1 flex flex-grow flex-col justify-between">
              <dt className="sr-only">Title</dt>
              <dd className="text-sm text-gray-600">{game.title}</dd>
              <dt className="sr-only">Role</dt>
              <dd className="mt-3">
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-500 ring-1 ring-inset ring-amber-500/20">
                  {game.domain}
                </span>
              </dd>
            </dl>
          </div>
          <div>
            <div className="-mt-px flex divide-x divide-gray-200">
              <div className="-ml-px flex w-0 flex-1">
                <a
                  href={`#/${game.gameUri}`}
                  className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                >
                  <PlayIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  เริ่มการทดสอบ
                </a>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}